import { exec } from 'child_process';
import path from 'path';
import fs from 'fs'; // Node.jsのファイル操作モジュールを読み込み
import archiver from 'archiver'; // archiverライブラリを読み込み

/**
 * 指定されたディレクトリ内で、2つの参照(ブランチ、コミット等)を比較し、
 * 変更（追加・更新）があったファイルリストを取得します。
 *
 * @param {string} sourceRef - 比較元となる参照 (ブランチ名、コミットハッシュなど)。
 * @param {string} targetRef - 比較先となる参照 (ブランチ名、コミットハッシュなど)。
 * @param {string} filterPath - 比較したいディレクトリの名前
 * @returns {Promise<string[]>} 変更があったファイルのパスの配列。
 */
function getUpdatedAndAddedFiles(sourceRef, targetRef, filterPath = '') {
  return new Promise((resolve, reject) => {

    // フィルタパスが指定されていれば、コマンドの末尾に追加する
    const pathFilter = filterPath ? `-- ${filterPath}` : '';
    const command = `git diff --name-status ${sourceRef} ${targetRef} ${pathFilter}`;

    // 現在のパス
    const absoluteRepoPath = path.resolve('.');

    exec(command, { cwd: absoluteRepoPath }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(`Git command failed: ${error.message}\n${stderr}`));
      }
      if (stderr && !stderr.startsWith('warning:')) { // 警告以外の標準エラーは問題の可能性
         console.warn(`Git command stderr: ${stderr}`);
      }

      // [[status, filePath]...]の形式に変換する
      const ConvertArray = stdout
        .trim()
        .split('\n')
        .filter(Boolean) // 空行を除外
        .map(line => line.split('\t'));

      // 'A' (追加)のみ
      const addedFiles = ConvertArray
        .filter(([status]) => status === 'A')
        .map(([, filePath]) => filePath);

      // 'C' (コピー)のみ
      const copiedFiles = ConvertArray
        .filter(([status]) => status === 'C')
        .map(([, filePath]) => filePath);

      // 'M' (変更)のみ
      const changedFiles = ConvertArray
        .filter(([status]) => status === 'M')
        .map(([, filePath]) => filePath);

      // 'D' (削除)のみ
      const deletedFiles = ConvertArray
        .filter(([status]) => status === 'D')
        .map(([, filePath]) => filePath);

      // 'R' (rename)のみ
      const renamedFiles = ConvertArray
        .filter(([status]) => status === 'R')
        .map(([, filePath]) => filePath);

      resolve({addedFiles, copiedFiles, changedFiles, deletedFiles,  renamedFiles});
    });
  });
}

/**
 * 差分ファイルをZIPアーカイブにする新しい関数
 * @param {string} zipFileName - 出力するZIPファイルの名前
 * @param {string[]} filesToZip - アーカイブに追加するファイルのパスの配列
 * @returns {Promise<void>}
 */
function createZipArchive(zipFileName, filesToZip) {
  return new Promise((resolve, reject) => {
    if (filesToZip.length === 0) {
      console.log('ZIPアーカイブの対象となる差分ファイルはありませんでした。');
      return resolve();
    }

    // 1. 出力先のファイルストリームを作成
    const output = fs.createWriteStream(zipFileName);
    // 2. archiverインスタンスを作成 (zip形式、高圧縮)
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    // 完了した時のイベントリスナー
    output.on('close', () => {
      console.log(`✅ 合計 ${archive.pointer()} bytes のZIPアーカイブが作成されました。`);
      resolve();
    });

    // エラー時のイベントリスナー
    archive.on('error', (err) => {
      reject(err);
    });

    // 3. 出力ストリームにarchiverをパイプで接続
    archive.pipe(output);

    // 4. 配列内の各ファイルをアーカイブに追加
    filesToZip.forEach(file => {
      // 第1引数:実際のファイルパス, 第2引数:zip内のパスとファイル名
      archive.file(file, { name: file });
    });

    // 5. アーカイブ化を完了
    archive.finalize();
  });
}

// --- メイン処理 ---
async function main() {
  // 1. コマンドライン引数を取得
  const [source, target, filterPath, zipFileName] = process.argv.slice(2);
  const jsonOutputFile = 'changedFilesList.json';

  // 2. 引数が足りない場合は使い方を表示して終了
  if (!source || !target) {
    console.error('使用法: node getChangedFilesList.mjs <比較元> <比較先> [フィルタパス] [zipファイル名]');
    process.exit(1);
  }

  try {
    // 3. Gitから変更ファイルリストを取得
    console.log(`'${source}' と '${target}' を比較しています...`);
    const {addedFiles, copiedFiles, changedFiles, deletedFiles,  renamedFiles} = await getUpdatedAndAddedFiles(source, target, filterPath);

    // 4. 出力用のデータオブジェクトを作成
    const outputData = {
      source: source,
      target: target,
      createdAt: new Date().toISOString(),
      addedFiles: {
        num: addedFiles.length,
        files: addedFiles
      },
      copiedFiles: {
        num: copiedFiles.length,
        files: copiedFiles
      },
      changedFiles: {
        num: changedFiles.length,
        files: changedFiles
      },
      deletedFiles: {
        num: deletedFiles.length,
        files: deletedFiles
      },
      renamedFiles: {
        num: renamedFiles.length,
        files: renamedFiles
      },
    };

    // 5. JSON文字列に変換し、ファイルに書き出す
    // JSON.stringifyの第3引数に2を指定すると、人間が読みやすいようにインデント付きで整形される
    const jsonString = JSON.stringify(outputData, null, 2);
    fs.writeFileSync(jsonOutputFile, jsonString);

    // 6. 完了メッセージを表示
    console.log(`✅ 成功: 差分リストを ${jsonOutputFile} に書き出しました。`);

    // 7. ZIPアーカイブ作成処理
    // ZIPファイル名が引数で指定されている場合のみ実行
    if (zipFileName) {
      // 1. ZIPに追加するファイルを決定 (追加・コピー・変更されたファイル)
      const filesToZip = [
        ...addedFiles,
        ...copiedFiles,
        ...changedFiles,
        ...renamedFiles.map(f => f.newPath) // リネームされたファイルは新しいパスを追加
      ];

      // 2. ZIP作成関数を呼び出し
      await createZipArchive(zipFileName, filesToZip);
    }

  } catch (error) {
    // エラーが発生した場合はメッセージを表示して終了
    console.error(`❌ エラーが発生しました: ${error.message}`);
    process.exit(1);
  }
}

main();
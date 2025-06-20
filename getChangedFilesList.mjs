const { exec } = require('child_process');
const path = require('path');
const fs = require('fs'); // Node.jsのファイル操作モジュールを読み込み

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

      resolve({addedFiles, changedFiles, deletedFiles,  renamedFiles});
    });
  });
}

// --- メイン処理 ---
async function main() {
  // 1. コマンドライン引数を取得
  const [source, target, filterPath, outputFile = 'changedFilesList.json'] = process.argv.slice(2);

  // 2. 引数が足りない場合は使い方を表示して終了
  if (!source || !target) {
    console.error('使用法: node getChangedFilesList.js [比較元] [比較先] [フィルタパス] [出力ファイル名]');
    process.exit(1);
  }

  try {
    // 3. Gitから変更ファイルリストを取得
    console.log(`'${source}' と '${target}' を比較しています...`);
    const {addedFiles, changedFiles, deletedFiles,  renamedFiles} = await getUpdatedAndAddedFiles(source, target, filterPath);

    // 4. 出力用のデータオブジェクトを作成
    const outputData = {
      source: source,
      target: target,
      createdAt: new Date().toISOString(),
      addedFiles: {
        num: addedFiles.length,
        files: addedFiles
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
    fs.writeFileSync(outputFile, jsonString);

    // 6. 完了メッセージを表示
    console.log(`✅ 成功: ファイルリストを ${outputFile} に書き出しました。`);

  } catch (error) {
    // エラーが発生した場合はメッセージを表示して終了
    console.error(`❌ エラーが発生しました: ${error.message}`);
    process.exit(1);
  }
}

main();

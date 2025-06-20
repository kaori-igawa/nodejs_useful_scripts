import fs from "fs";
import path from "path";
import sharp from "sharp";

// 画像が入っているルートディレクトリ
const CURRENT_DIR = process.cwd();
const INPUT_DIR = path.join(CURRENT_DIR, "public/assets");
const OUTPUT_DIR = path.join(CURRENT_DIR, "out/assets");

// 許可する画像
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png"];

// 圧縮除外する画像
const EXCLUDE_IMAGES = [
  path.join(CURRENT_DIR, 'public/assets/images/top/mainVisual/kirakira.png'),
];

// ディレクトリを再帰的に検索して画像ファイルを取得
function getAllImageFiles(dir) {
  let results = [];
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // サブディレクトリの中も検索
      results = results.concat(getAllImageFiles(filePath));
    } else if (ALLOWED_EXTENSIONS.includes(path.extname(file).toLowerCase()) && !EXCLUDE_IMAGES.includes(filePath)) {
      // 許可された拡張子のみ追加
      results.push(filePath);
    }
  }

  return results;
}

// 画像を圧縮
async function compressImage(inputPath, outputPath) {
  try {
    const ext = path.extname(inputPath).toLowerCase();

    let sharpInstance = sharp(inputPath);

    if (ext === ".jpg" || ext === ".jpeg") {
      sharpInstance = sharpInstance.jpeg({ quality: 75 });
    } else if (ext === ".png") {
      sharpInstance = sharpInstance.png({ quality: 80 });
    } else {
      console.log(`⚠️ スキップ: ${inputPath}（対応していない形式）`);
      return;
    }
    await sharpInstance.toFile(outputPath);
    console.log(`✅ 成功: ${outputPath}`);
  } catch (error) {
    console.error(`❌ 失敗: ${inputPath} (${error.message})`);
  }
}

// 画像を処理するメイン関数
async function imageOptimize() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const imageFiles = getAllImageFiles(INPUT_DIR);
  
  if (imageFiles.length === 0) {
    console.log("⚠️ 画像ファイルが見つかりません。");
    return;
  }

  let index = 1;
  for (const file of imageFiles) {
    const relativePath = path.relative(INPUT_DIR, file);
    const outputPath = path.join(OUTPUT_DIR, relativePath);

    // 出力ディレクトリが存在しない場合は作成
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    console.log(`🔄 圧縮中: ${index}/${imageFiles.length} `);
    await compressImage(file, outputPath);
    index++;
  }
  console.log("🎉 圧縮完了しました");
}

imageOptimize();
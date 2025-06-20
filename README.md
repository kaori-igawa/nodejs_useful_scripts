# nodejs_useful_scripts
node.jsで書いた便利Scriptを入れていくRepository 

## 画像圧縮 - imageOptimize 
 
以下コマンドで画像圧縮が実行されます。 
対象dirなどは `imageOptimize.mjs` 内を適所修正してください。 
 
### 実行コマンド 
```
npm run imageOptimize
```
 
## 変更データの一覧取得 - getChangedFilesList 
 
以下のコマンドでmainブランチとdevelopブランチで追加・変更・削除・リネームされたファイルのリストがJSON形式で出力されます。
 
### 実行コマンド 
```
npm run getChangedFilesList
```
### 出力データのpath 
```
changedFilesList.json
```
 
### 比較元、比較先を指定する
比較元、比較先などを指定したい場合は以下のようにしてコマンドを実行してください。 
`フィルタパス` `出力ファイル名`はなしでもOKです。 
```
node getChangedFilesList.js [比較元(ブランチ名、コミットハッシュなど)] [比較先(ブランチ名、コミットハッシュなど)] [フィルタパス] [出力ファイル名]
```
 
#### 例
```
node getChangedFilesList.js develop issues/issue_#1 htdocs hogehoge.json
```

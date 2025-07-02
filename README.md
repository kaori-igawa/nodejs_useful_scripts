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
 
 ### 変更ファイルリストを出力する
以下のコマンドでmainブランチとdevelopブランチで追加・変更・削除・リネームされたファイルのリストがJSON形式で出力されます。  
 
#### 実行コマンド 
```
npm run getChangedFilesList
```
#### 出力データのpath 
```
changedFilesList.json
```

### 変更データのみを抽出したzipファイルを作成する
以下のコマンドで変更データのみを抽出したzipファイルも作成できます。

#### 実行コマンド 
```
npm run getChangedFilesList:createZip
```
#### 出力データのpath 
```
diff.zip
```

 
### 比較元、比較先を指定する
比較元、比較先などを指定したい場合は以下のようにしてコマンドを実行してください。   
`出力zipファイル名`はない場合はzipファイルは出力されません。  

```
比較元 ⇛ 比較元のブランチ名、コミットハッシュなど
比較先 ⇛ 比較先のブランチ名、コミットハッシュなど
フィルタパス ⇛ 比較したいディレクトリのパス
出力zipファイル名 ⇛ 出力するzipファイル名（ない場合はzip出力されない）
```

```
node getChangedFilesList.mjs [比較元] [比較先] [フィルタパス] [出力zipファイル名]
```
 
#### 例
```
node getChangedFilesList.mjs develop issues/issue_#1 htdocs hogehoge.zip
```

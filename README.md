# CoC探索者ステータス診断「その角を曲がる前に」

短編CoC風シナリオを実際に進め、その選択履歴から6版風ステータスを算出する、GitHub Pages向けの静的Webアプリです。

- フレームワーク不使用：TypeScript + ES Modules
- GitHub Pagesのサブディレクトリ配信に対応
- 24 Sceneの分岐プレイ
- 戻る・中断再開・決定論的1D100
- STR / CON / SIZ / DEX / APP / INT / POW / EDU / SAN / 幸運
- エンディングA～G
- 結果画像、共有、結果文コピー、プレイログJSON
- 結果後の任意アンケート
- 初期状態では外部送信なし

## すぐ公開する方法

### 1. 新規GitHubリポジトリへ配置

このフォルダの中身を、リポジトリのルートへそのまま配置します。

### 2. GitHub PagesをActions配信にする

GitHubのリポジトリ画面で次を選びます。

1. `Settings`
2. `Pages`
3. `Build and deployment`
4. `Source: GitHub Actions`

`main`ブランチへpushすると、`.github/workflows/deploy-pages.yml`がビルド・検査・公開を行います。

### 3. 公開URL

通常は次の形式です。

```text
https://<GitHubユーザー名>.github.io/<リポジトリ名>/
```

相対パスだけを使用しているため、リポジトリ名の下に配信されても動作します。

## ローカル確認

Node.js 22以降を推奨します。

```bash
npm install
npm run check
npm run serve
```

ブラウザで次を開きます。

```text
http://127.0.0.1:4173/
```

ポートを変える場合：

```bash
npm run serve -- 8080
```

## ビルド成果物

```text
docs/
```

へ静的サイト一式を生成します。GitHub Pagesを「mainブランチの `/docs`」から配信する方式でも利用できます。ただし、本リポジトリにはActions配信用ワークフローも含まれているため、通常はActions方式を推奨します。

## 設定

公開後の表示設定と外部送信設定は、次のファイルに集約しています。

```text
public/site-config.js
```

主要項目：

```javascript
window.APP_CONFIG = {
  appName: "CoC探索者ステータス診断",
  scenarioTitle: "その角を曲がる前に",
  version: "1.1.0-beta.1",
  dataEndpoint: "",
  collectDiagnostics: false,
  shareUrl: "",
  rightsNotice: "..."
};
```

### 外部送信を使わない場合

初期設定のままにします。

```javascript
dataEndpoint: "",
collectDiagnostics: false
```

回答履歴は中断・再開のためブラウザの `localStorage` にだけ保存されます。

### GAS等へ回答ログを送る場合

```javascript
dataEndpoint: "https://script.google.com/macros/s/......../exec",
collectDiagnostics: true
```

アプリは診断完了ログと、結果後に任意送信された経験アンケートを `POST` します。本文はJSON文字列ですが、GASのCORSプリフライトを避けやすいよう `Content-Type: text/plain;charset=utf-8` で送信します。

送信先は、受信データの検証、保存期間、削除方法、公開範囲を別途管理してください。

## ディレクトリ構成

```text
.github/workflows/   GitHub Pages公開
public/              HTML・CSS・公開設定・画像
src/app.ts           画面遷移とUI
src/ability.ts       β版能力値換算
src/visuals.ts       レーダー・結果画像生成
src/storage.ts       localStorage
src/logging.ts       任意の外部送信
src/core/            診断・物語・採点・エンディングのコア
scripts/             ビルド・配信・検査
reports/             コアの経路探索結果
Tests/               自動検査
Docs/                ビルド済みGitHub Pagesサイト
```

実際のフォルダ名は小文字です：`tests/`、`docs/`。


### v1.1の回答形式

全Sceneで、物語本文だけでなく「目的・確定情報・選択の代償」を表示します。回答形式はSceneに合わせて使い分けます。

- 通常の行動カード
- 安全と速度を連続値で示すスライダー
- 二つの価値を別々に測る二軸スライダー
- 限られた点数を配る資源配分
- 最初に行う行動を並べる優先順位

スライダー・配分・順位の生データはプレイログへ保存されます。順位操作はドラッグ必須にせず、スマートフォンでも使える上下ボタン式です。

## 診断ロジック

### 物語と採点の分離

- 選択内容：能力値の測定材料
- ダイス結果：物語状態だけに影響
- エンディング：能力値へ加点しない
- 倉持の最終固定：S03の追質問で処理し、その追質問自体は採点しない

### β版能力値

公開初期は、内部連続値を固定の理論変換でパーセンタイル化し、以下へ写像します。

- STR / CON / DEX / APP / POW：3D6
- SIZ / INT：2D6+6
- EDU：3D6+3
- SAN / 幸運：3D6×5相当

これは校正データ蓄積前の暫定換算です。正式校正へ移る際は `src/ability.ts` の変換処理とバージョンを更新してください。

## 状態保存

保存キー：

```text
coc-status-diagnosis:session:v1
coc-status-diagnosis:survey:v1
```

保存対象：

- 現在Scene
- 物語状態
- 診断内部状態
- 選択履歴
- 戻るためのスナップショット
- 決定済みダイス結果
- 結果後の任意アンケート

「保存データを削除」からブラウザ内データを消去できます。

## 自動検査

```bash
npm run check
```

以下を検査します。

- TypeScriptビルド
- GitHub Pages必須ファイル
- 24測定Sceneの順序
- 各能力値の最低観測回数
- S03追質問が無採点であること
- 戻る後もダイスが再現されること
- Ending A～Gの具体的到達経路
- H2以上でEnding Aへ入らないこと
- 複数固定がH3・Ending Fへつながること
- 状態等価探索上の行き止まり・不変条件違反
- 明示的Scene変種の到達性
- Mermaid図と実装データの一致
- GitHub Pages用相対パス

## 開発用データ

ビルド時に以下も生成します。

```text
docs/dev/flow.mmd
docs/dev/scenes.json
docs/dev/endings.json
docs/dev/kuramochi-cards.json
```

シナリオや分岐を編集した場合、`npm run check`で再生成・再検査してください。

## 公開前チェック

- `public/site-config.js` のバージョンと共有URL
- データを送信する場合の `dataEndpoint`
- `public/data-policy.html` の運用実態との一致
- GitHub PagesのSourceがGitHub Actionsになっていること
- スマートフォンとPCで最初から結果まで完走できること
- 権利表記を削除していないこと

## 権利表記

画面フッターと設定ファイルに、クトゥルフ神話TRPG二次創作ガイドラインに沿った権利表記を含めています。公開時は該当箇所を削除しないでください。

## バージョン

- Core: `0.6.0`
- UI: `1.1.0-beta.1`

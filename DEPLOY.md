# GitHub Pages公開手順

## Actions方式（推奨）

1. GitHubで空の新規リポジトリを作成する。
2. このプロジェクトの全ファイルをリポジトリのルートへ入れる。
3. `main` ブランチへpushする。
4. `Settings > Pages > Build and deployment` を開く。
5. `Source` を `GitHub Actions` にする。
6. `Actions` タブで `Deploy GitHub Pages` が成功するまで待つ。
7. Pages画面に表示されるURLを開く。

## `/docs`方式

Actionsを使わない場合：

1. ローカルで `npm install`。
2. `npm run check`。
3. 生成された `docs/` を含めてpushする。
4. `Settings > Pages` で `Deploy from a branch`。
5. Branchを `main`、Folderを `/docs` にする。

## 独自ドメイン

GitHub Pages側で独自ドメインを設定した後、`public/site-config.js` の `shareUrl` に公開URLを設定し、再ビルドします。

```javascript
shareUrl: "https://example.com/"
```

## 更新

Scene、採点、結果文を変更した場合：

```bash
npm run check
git add .
git commit -m "Update diagnosis"
git push
```

Actions方式なら自動で再公開されます。

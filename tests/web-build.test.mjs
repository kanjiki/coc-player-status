import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const html = readFileSync("docs/index.html", "utf8");

test("GitHub Pagesの必須ファイルが生成される", () => {
  for (const file of [
    "docs/index.html",
    "docs/404.html",
    "docs/app.js",
    "docs/styles.css",
    "docs/config.js",
    "docs/core/engine.js",
    "docs/core/scenes.js"
  ]) assert.equal(existsSync(file), true, file);
});

test("HTMLは相対パスでGitHub Pagesサブパスに対応する", () => {
  assert.match(html, /src="\.\/app\.js"/);
  assert.match(html, /href="\.\/styles\.css"/);
  assert.doesNotMatch(html, /(?:src|href)="\//);
});

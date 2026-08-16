import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync("src/app.ts", "utf8");

test("situation panel uses plain-language labels", () => {
  for (const phrase of ["現在の状況", "いまの目的", "いまいる場所", "一緒にいる人", "連絡が取れる人", "残り調査猶予", "いま確認できている異常"]) {
    assert.ok(app.includes(phrase), `missing: ${phrase}`);
  }
  assert.ok(!app.includes("return `猶予 ${state.story.timeUnits}`"));
});

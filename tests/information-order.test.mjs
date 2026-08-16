import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const guides = readFileSync(new URL("../src/core/sceneGuides.ts", import.meta.url), "utf8");
const readAloud = readFileSync(new URL("../src/core/readAloud.ts", import.meta.url), "utf8");
const app = readFileSync(new URL("../src/app.ts", import.meta.url), "utf8");

function block(source, slot, nextSlot) {
  const start = source.indexOf(`  ${slot}: {`);
  const end = source.indexOf(`  ${nextSlot}: {`, start);
  assert.ok(start >= 0 && end > start, `${slot} block not found`);
  return source.slice(start, end);
}

function narrationBlock(source, slot, nextSlot) {
  const start = source.indexOf(`  ${slot}: \``);
  const end = source.indexOf(`  ${nextSlot}: \``, start);
  assert.ok(start >= 0 && end > start, `${slot} narration not found`);
  return source.slice(start, end);
}

test("early guides do not reveal the temporal/curved-space solution", () => {
  const m01 = block(guides, "M01", "M06");
  const m02 = block(guides, "M02", "L02");
  const m07 = block(guides, "M07", "M10");
  assert.doesNotMatch(m01, /近接した時間状態|確定未来ではなく/);
  assert.doesNotMatch(m02, /怪異を消す|出現を遅らせる|角をなくすため/);
  assert.doesNotMatch(m07, /近接時間状態|時間角へ接近/);
});

test("M10 guide contains no diagnosis meta-language or unearned learning claim", () => {
  const m10 = block(guides, "M10", "S01");
  assert.doesNotMatch(m10, /診断開始後|こちらの情報も学習している/);
});

test("S01 introduces the apparatus name before later use of 時角", () => {
  const s01 = narrationBlock(readAloud, "S01", "M08");
  assert.match(s01, /時角干渉観測器/);
});

test("M14 is the explicit Tindalos naming scene", () => {
  const m14 = narrationBlock(readAloud, "M14", "S04");
  assert.match(m14, /TINDALOS|Hounds of Tindalos|ティンダロス/);
});

test("S04 is the first common narration that can establish A-B-C divergence", () => {
  const s04 = narrationBlock(readAloud, "S04", "M13");
  assert.match(s04, /A|B|C/);
  const beforeS04 = readAloud.slice(0, readAloud.indexOf("  S04: `"));
  assert.doesNotMatch(beforeS04, /A・B・Cはすべて同一人物から分岐|三つの時間状態へ分か/);
});

test("L04 does not reveal each Kuramochi role before first information contact", () => {
  const l04Guide = block(guides, "L04", "S03");
  const l04Narration = narrationBlock(readAloud, "L04", "S03");
  assert.doesNotMatch(l04Guide, /Aは装置|Bは身体|Cは榊/);
  assert.doesNotMatch(l04Narration, /観測器の構造|安全な出口|榊へ救援/);
});

test("common M16 narration remains neutral when S04 knowledge was discarded", () => {
  const m16 = narrationBlock(readAloud, "M16", "L04");
  assert.doesNotMatch(m16, /Aは装置|Bは出口|Cは榊/);
});

test("common guide text does not assume the exact 03:17 deadline", () => {
  assert.doesNotMatch(guides, /午前3時17分/);
  assert.doesNotMatch(readAloud, /午前3時17分/);
});

test("scene guide rendering is state-aware", () => {
  assert.match(app, /getSceneKnownFacts/);
  assert.match(app, /sceneGuideMarkup\(scene, session\.state\)/);
});

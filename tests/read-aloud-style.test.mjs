import test from "node:test";
import assert from "node:assert/strict";
import { MEASUREMENT_ORDER } from "../docs/core/constants.js";
import { READ_ALOUD_TEXT } from "../docs/core/readAloud.js";

const META_PHRASES = [
  "今回の目的",
  "この判断で変わること",
  "判断：",
  "制約：",
  "測定軸",
  "診断得点",
  "最善手を当てる",
  "選択肢を比較",
  "ここで選ぶのは"
];

test("24 Sceneすべてに十分なKP読み上げ本文がある", () => {
  assert.deepEqual(Object.keys(READ_ALOUD_TEXT).sort(), [...MEASUREMENT_ORDER].sort());
  for (const slotId of MEASUREMENT_ORDER) {
    const text = READ_ALOUD_TEXT[slotId];
    assert.ok(text.length >= 180, `${slotId}: read-aloud text is too short`);
    const paragraphs = text.split(/\n\s*\n/).map((value) => value.trim()).filter(Boolean);
    assert.ok(paragraphs.length >= 4, `${slotId}: too few read-aloud paragraphs`);
  }
});

test("KP読み上げ本文に診断票用のメタ説明を混ぜない", () => {
  for (const [slotId, text] of Object.entries(READ_ALOUD_TEXT)) {
    for (const phrase of META_PHRASES) {
      assert.ok(!text.includes(phrase), `${slotId}: contains meta phrase ${phrase}`);
    }
  }
});

test("KP読み上げ本文はPCの感情を直接指定する定型を避ける", () => {
  const prohibited = [
    /あなたは.{0,12}(怖|恐ろし|不安|悲し|嬉し|興奮|嫌悪|安心).{0,8}(感じ|思う|覚える)/,
    /あなたは.{0,12}気になる/,
    /探索者は.{0,12}(怖|恐ろし|不安|悲し|嬉し|興奮|嫌悪|安心).{0,8}(感じ|思う|覚える)/
  ];
  for (const [slotId, text] of Object.entries(READ_ALOUD_TEXT)) {
    for (const pattern of prohibited) {
      assert.ok(!pattern.test(text), `${slotId}: appears to prescribe PC emotion: ${pattern}`);
    }
  }
});

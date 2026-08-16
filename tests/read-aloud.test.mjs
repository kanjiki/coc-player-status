import test from "node:test";
import assert from "node:assert/strict";
import { MEASUREMENT_ORDER } from "../docs/core/constants.js";
import { READ_ALOUD_TEXT } from "../docs/core/readAloud.js";

test("24 SceneすべてにKP読み上げ本文がある", () => {
  assert.deepEqual(Object.keys(READ_ALOUD_TEXT).sort(), [...MEASUREMENT_ORDER].sort());
  for (const slotId of MEASUREMENT_ORDER) {
    const text = READ_ALOUD_TEXT[slotId];
    assert.ok(typeof text === "string", `${slotId}: read-aloud text missing`);
    assert.ok(text.length >= 180, `${slotId}: read-aloud text too short`);
    assert.ok(text.includes("\n\n"), `${slotId}: paragraph breaks missing`);
  }
});

test("読み上げ本文に診断用ラベルを混ぜない", () => {
  const forbidden = ["今回の目的", "この判断で変わること", "診断得点", "STR", "CON", "DEX", "APP", "POW", "EDU", "SAN_DEPTH"];
  for (const [slotId, text] of Object.entries(READ_ALOUD_TEXT)) {
    for (const word of forbidden) {
      assert.ok(!text.includes(word), `${slotId}: diagnostic label leaked: ${word}`);
    }
  }
});

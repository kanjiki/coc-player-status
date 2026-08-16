import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateStaticModel } from "../docs/core/validators.js";
import { renderMermaid } from "../docs/core/flow.js";
import { SCENES } from "../docs/core/scenes.js";
import { MEASUREMENT_ORDER } from "../docs/core/constants.js";

test("24測定スロットと静的仕様が整合する", () => {
  const flow = readFileSync("docs/dev/flow.mmd", "utf8");
  const issues = validateStaticModel(flow);
  assert.deepEqual(issues, []);
  assert.equal(SCENES.length, 24);
  assert.deepEqual(SCENES.map((scene) => scene.slotId), [...MEASUREMENT_ORDER]);
});

test("Mermaidはコード生成結果と一致する", () => {
  assert.equal(readFileSync("docs/dev/flow.mmd", "utf8"), renderMermaid());
});

test("全Sceneに本文・帰結文・状態変更可能な選択肢がある", () => {
  for (const scene of SCENES) {
    assert.ok(scene.body.length >= 40, `${scene.slotId} body too short`);
    assert.ok(scene.choices.length >= 3, `${scene.slotId} choices missing`);
    for (const choice of scene.choices) {
      assert.ok(choice.label.length >= 8, `${choice.id} label too short`);
      assert.ok(choice.outcome.length >= 15, `${choice.id} outcome too short`);
      assert.ok(Object.keys(choice.diagnosticWeights).length >= 2, `${choice.id} weights missing`);
    }
  }
});

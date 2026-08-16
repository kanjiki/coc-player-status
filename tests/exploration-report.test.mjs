import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { SCENES } from "../docs/core/scenes.js";

test("状態等価探索に行き止まり・不変条件違反がない", { skip: !existsSync("reports/path-exploration.json") }, () => {
  const report = JSON.parse(readFileSync("reports/path-exploration.json", "utf8"));
  assert.equal(report.reachedSlots.length, 24);
  assert.deepEqual(report.deadEnds, []);
  assert.deepEqual(report.invariantViolations, []);
  for (const count of Object.values(report.endings)) {
    assert.ok(BigInt(count) > 0n);
  }
});

test("定義した明示的Scene変種はすべて到達する", { skip: !existsSync("reports/path-exploration.json") }, () => {
  const report = JSON.parse(readFileSync("reports/path-exploration.json", "utf8"));
  const explicitVariants = SCENES.flatMap((scene) => scene.variants.map((variant) => variant.id));
  const missing = explicitVariants.filter((variant) => !report.reachedSceneVariants.includes(variant));
  assert.deepEqual(missing, []);
});

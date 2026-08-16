import test from "node:test";
import assert from "node:assert/strict";
import { runAllEndingWitnesses } from "../docs/core/witnesses.js";

test("A～Gすべてに具体的な回答列で到達できる", () => {
  const results = runAllEndingWitnesses();
  assert.equal(results.length, 7);
  for (const result of results) {
    assert.equal(result.actualEnding, result.expectedEnding, result.expectedEnding);
  }
});

test("H2以上ではEnding Aへ入らない", () => {
  const result = runAllEndingWitnesses().find((item) => item.expectedEnding === "ENDING_D_PURSUIT_CONTINUES");
  assert.ok(result);
  assert.ok(result.state.mythos.houndStage >= 2);
  assert.equal(result.actualEnding, "ENDING_D_PURSUIT_CONTINUES");
});

test("複数固定はH3とEnding Fを必ず伴う", () => {
  const result = runAllEndingWitnesses().find((item) => item.expectedEnding === "ENDING_F_MULTIPLE_UNCHOSEN");
  assert.ok(result);
  assert.equal(result.state.kuramochi.multipleFixation, true);
  assert.equal(result.state.kuramochi.fixedVariant, null);
  assert.equal(result.state.mythos.houndStage, 3);
  assert.equal(result.actualEnding, "ENDING_F_MULTIPLE_UNCHOSEN");
});

import test from "node:test";
import assert from "node:assert/strict";
import { applyChoice } from "../docs/core/engine.js";
import { createInitialState } from "../docs/core/initialState.js";
import { DIAGNOSTIC_AXES, MEASUREMENT_ORDER } from "../docs/core/constants.js";
import { ENDING_WITNESS_PLANS, runWitnessPlan } from "../docs/core/witnesses.js";

test("同じスナップショットから戻って同じ判定を選ぶと同じ出目になる", () => {
  let state = createInitialState("rollback-seed");
  state = applyChoice(state, "M03_quick_copy").state;
  state = applyChoice(state, "M01_analyze_phase").state;
  state = applyChoice(state, "M06_immediate").state;
  state = applyChoice(state, "M02_limited").state;

  const snapshot = structuredClone(state);
  const first = applyChoice(snapshot, "L02_roll_now");
  const second = applyChoice(structuredClone(state), "L02_roll_now");
  assert.equal(first.diceRoll, second.diceRoll);
  assert.equal(first.diceSuccess, second.diceSuccess);
  assert.deepEqual(first.state.story, second.state.story);
});

test("S03の単一固定方針は採点外のA/B/C選択を要求する", () => {
  const result = runWitnessPlan("ENDING_A_ANGLELESS_MORNING", ENDING_WITNESS_PLANS.ENDING_A_ANGLELESS_MORNING);
  assert.equal(result.state.kuramochi.fixedVariant, "C");
  assert.ok(result.state.kuramochi.fixationStability >= 3);
});

test("24Sceneを順番どおり通り、各指標を最低4回測る", () => {
  const result = runWitnessPlan("ENDING_A_ANGLELESS_MORNING", ENDING_WITNESS_PLANS.ENDING_A_ANGLELESS_MORNING);
  assert.equal(result.state.history.length, 24);
  assert.deepEqual(result.state.history.map((entry) => entry.slotId), [...MEASUREMENT_ORDER]);
  for (const axis of DIAGNOSTIC_AXES) {
    assert.ok(result.state.diagnostic[axis].primaryObservations >= 4, `${axis} primary observations`);
    assert.ok(result.state.diagnostic[axis].validObservations >= 4, `${axis} valid observations`);
  }
});

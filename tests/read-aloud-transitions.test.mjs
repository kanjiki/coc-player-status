import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../docs/core/initialState.js";
import { getReadAloudTransition } from "../docs/core/readAloudTransitions.js";

function prepare(currentSlot, previousSlot, selectedChoiceId) {
  const state = createInitialState("transition-test");
  state.story.currentSlot = currentSlot;
  state.history = [{
    slotId: previousSlot,
    sceneVariantId: `${previousSlot}_test`,
    visibleChoiceIds: [selectedChoiceId],
    selectedChoiceId,
    snapshotHash: "test"
  }];
  return state;
}

test("図面未取得でもM05へのつなぎが図面を既成事実にしない", () => {
  const state = prepare("M05", "L02", "L02_partial_then_roll");
  state.story.flags.push("management_room_unopened");
  const text = getReadAloudTransition(state);
  assert.match(text, /図面を持ち出すことはできなかった/);
});

test("M07の四ルートがM10で異なる出現演出へつながる", () => {
  const expected = {
    follow: /予定外の部屋/,
    keep_plan: /旧洗濯室/,
    limited_follow: /空間が薄く二重/,
    seal: /記録した機器/
  };
  for (const [route, pattern] of Object.entries(expected)) {
    const state = prepare("M10", "M07", `M07_${route}`);
    state.story.routes.echo = route;
    assert.match(getReadAloudTransition(state), pattern, route);
  }
});

test("M16の最終範囲がL04冒頭へ反映される", () => {
  const expected = {
    rescue: /救出/,
    network: /四棟回路/,
    both: /並行/,
    local: /再封鎖/
  };
  for (const [scope, pattern] of Object.entries(expected)) {
    const state = prepare("L04", "M16", `M16_${scope}`);
    state.story.routes.finalScope = scope;
    assert.match(getReadAloudTransition(state), pattern, scope);
  }
});

test("S03の三つの帰結がS02で別々の読み上げになる", () => {
  const single = prepare("S02", "S03", "S03_body_only");
  single.kuramochi.fixedVariant = "B";
  single.kuramochi.state = "fixed";
  assert.match(getReadAloudTransition(single), /倉持B/);

  const none = prepare("S02", "S03", "S03_no_fixation");
  none.story.flags.push("no_kuramochi_fixed");
  none.kuramochi.state = "unfixed";
  assert.match(getReadAloudTransition(none), /固定を行わない/);

  const multiple = prepare("S02", "S03", "S03_multiple");
  multiple.story.flags.push("single_fixation_safety_removed");
  multiple.kuramochi.multipleFixation = true;
  multiple.mythos.houndStage = 3;
  assert.match(getReadAloudTransition(multiple), /追跡者までこちら側/);
});

test("H2以上ではS04冒頭に追跡継続が入る", () => {
  const state = prepare("S04", "M14", "M14_direct_observation");
  state.mythos.houndStage = 2;
  assert.match(getReadAloudTransition(state), /影は完全には消えない/);
});

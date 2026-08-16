import test from "node:test";
import assert from "node:assert/strict";
import { MEASUREMENT_ORDER } from "../docs/core/constants.js";
import { RESPONSE_CONFIGS } from "../docs/core/responseConfigs.js";
import { SCENE_GUIDES } from "../docs/core/sceneGuides.js";
import { SCENE_BY_SLOT } from "../docs/core/scenes.js";

const structuredSlots = Object.keys(RESPONSE_CONFIGS);

test("24 Sceneすべてに目的・確定情報・代償・判断指示がある", () => {
  assert.deepEqual(Object.keys(SCENE_GUIDES).sort(), [...MEASUREMENT_ORDER].sort());
  for (const slotId of MEASUREMENT_ORDER) {
    const guide = SCENE_GUIDES[slotId];
    assert.ok(guide.objective.length >= 18, `${slotId}: objective too short`);
    assert.ok(guide.knownFacts.length >= 3, `${slotId}: known facts missing`);
    assert.ok(guide.knownFacts.every((fact) => fact.length >= 12), `${slotId}: fact too short`);
    assert.ok(guide.stakes.length >= 30, `${slotId}: stakes too short`);
    assert.ok(guide.decisionPrompt.length >= 16, `${slotId}: decision prompt too short`);
  }
});

test("構造化回答は必要な場面だけに使い、資源配分形式を使用しない", () => {
  const kinds = new Set(Object.values(RESPONSE_CONFIGS).map((config) => config.kind));
  assert.deepEqual([...kinds].sort(), ["quadrant", "ranking", "slider"]);
  assert.ok(![...kinds].includes("allocation"), "allocation response must not be active");
  assert.ok(structuredSlots.length >= 6, "structured response scenes are insufficient");

  for (const [slotId, config] of Object.entries(RESPONSE_CONFIGS)) {
    const scene = SCENE_BY_SLOT[slotId];
    assert.ok(scene, `${slotId}: scene missing`);
    const choiceIds = new Set(scene.choices.map((choice) => choice.id));

    if (config.kind === "slider") {
      assert.equal(config.bands.at(-1)?.max, 100, `${slotId}: slider must end at 100`);
      let previous = -1;
      for (const band of config.bands) {
        assert.ok(band.max > previous, `${slotId}: slider bands not sorted`);
        assert.ok(choiceIds.has(band.choiceId), `${slotId}: ${band.choiceId} missing`);
        previous = band.max;
      }
    }

    if (config.kind === "quadrant") {
      for (const choiceId of Object.values(config.choices)) {
        assert.ok(choiceIds.has(choiceId), `${slotId}: ${choiceId} missing`);
      }
      for (const choiceId of config.extraChoiceIds ?? []) {
        assert.ok(choiceIds.has(choiceId), `${slotId}: extra ${choiceId} missing`);
      }
    }

    if (config.kind === "allocation") {
      assert.ok(config.budget >= config.items.length, `${slotId}: allocation budget too small`);
      assert.equal(new Set(config.items.map((item) => item.id)).size, config.items.length, `${slotId}: duplicate allocation id`);
      for (const item of config.items) {
        assert.ok(choiceIds.has(item.dominantChoiceId), `${slotId}: ${item.dominantChoiceId} missing`);
      }
      assert.ok(choiceIds.has(config.balancedChoiceId), `${slotId}: balanced choice missing`);
    }

    if (config.kind === "ranking") {
      assert.equal(new Set(config.choiceIds).size, config.choiceIds.length, `${slotId}: duplicate ranking choice`);
      for (const choiceId of config.choiceIds) {
        assert.ok(choiceIds.has(choiceId), `${slotId}: ${choiceId} missing`);
      }
    }
  }
});

test("スライダーと二軸回答の連続値が診断証拠へ反映される", async () => {
  const { computeResponseObservations } = await import("../docs/core/scoring.js");

  const sliderBase = SCENE_BY_SLOT.L03;
  const sliderScene = { ...sliderBase, sceneVariantId: "base" };
  const sliderChoice = sliderScene.choices.find((choice) => choice.id === "L03_reinforced");
  assert.ok(sliderChoice);
  const sliderObservations = computeResponseObservations(
    sliderScene,
    sliderScene.choices,
    sliderChoice,
    {
      kind: "slider",
      value: 75,
      selectedBand: "L03_reinforced",
      axisEvidence: { LUCK: 0.5, CON: -0.5 }
    }
  );
  assert.equal(sliderObservations.find((item) => item.axis === "LUCK")?.evidence, 0.5);
  assert.equal(sliderObservations.find((item) => item.axis === "CON")?.evidence, -0.5);

  const quadrantBase = SCENE_BY_SLOT.S01;
  const quadrantScene = { ...quadrantBase, sceneVariantId: "base" };
  const quadrantChoice = quadrantScene.choices.find((choice) => choice.id === "S01_remote");
  assert.ok(quadrantChoice);
  const quadrantObservations = computeResponseObservations(
    quadrantScene,
    quadrantScene.choices,
    quadrantChoice,
    {
      kind: "quadrant",
      x: 80,
      y: 20,
      quadrant: "highLow",
      axisEvidence: { POW: 0.6, SAN_DEPTH: -0.6 }
    }
  );
  assert.equal(quadrantObservations.find((item) => item.axis === "POW")?.evidence, 0.6);
  assert.equal(quadrantObservations.find((item) => item.axis === "SAN_DEPTH")?.evidence, -0.6);
});

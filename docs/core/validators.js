import { CLUE_REGISTRY, DIAGNOSTIC_AXES, INVENTORY_REGISTRY, MEASUREMENT_ORDER } from "./constants.js";
import { FLOW_EDGES, FLOW_NODES, renderMermaid } from "./flow.js";
import { SCENES } from "./scenes.js";
const ALLOWED_WEIGHTS = new Set([-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1]);
function validateEffect(effect, issues, slotId, choiceId) {
    if (effect.op !== "add")
        return;
    if (effect.path === "story.clues" && !(effect.value in CLUE_REGISTRY)) {
        issues.push({
            severity: "error",
            code: "UNKNOWN_CLUE",
            message: `Unknown clue id: ${effect.value}`,
            slotId: slotId,
            choiceId
        });
    }
    if (effect.path === "story.inventory" && !(effect.value in INVENTORY_REGISTRY)) {
        issues.push({
            severity: "error",
            code: "UNKNOWN_INVENTORY",
            message: `Unknown inventory id: ${effect.value}`,
            slotId: slotId,
            choiceId
        });
    }
}
export function validateStaticModel(flowFileContent) {
    const issues = [];
    if (SCENES.length !== 24) {
        issues.push({ severity: "error", code: "SCENE_COUNT", message: `Expected 24 scenes, got ${SCENES.length}` });
    }
    const slots = SCENES.map((scene) => scene.slotId);
    if (new Set(slots).size !== slots.length) {
        issues.push({ severity: "error", code: "DUPLICATE_SLOT", message: "Duplicate measurement slot ids exist" });
    }
    if (JSON.stringify(slots) !== JSON.stringify(MEASUREMENT_ORDER)) {
        issues.push({ severity: "error", code: "ORDER_MISMATCH", message: "Scene order differs from MEASUREMENT_ORDER" });
    }
    const globalChoiceIds = new Set();
    const globalVariantIds = new Set();
    const primaryCounts = Object.fromEntries(DIAGNOSTIC_AXES.map((axis) => [axis, 0]));
    for (const scene of SCENES) {
        if (scene.choices.length < 3 || scene.choices.length > 5) {
            issues.push({
                severity: "error",
                code: "CHOICE_COUNT",
                message: `${scene.slotId} must have 3-5 choices, got ${scene.choices.length}`,
                slotId: scene.slotId
            });
        }
        if (scene.primaryAxes[0] === scene.primaryAxes[1]) {
            issues.push({ severity: "error", code: "DUPLICATE_PRIMARY_AXIS", message: `${scene.slotId} has duplicate primary axes`, slotId: scene.slotId });
        }
        primaryCounts[scene.primaryAxes[0]] += 1;
        primaryCounts[scene.primaryAxes[1]] += 1;
        for (const axis of scene.primaryAxes) {
            const values = scene.choices.map((item) => item.diagnosticWeights[axis] ?? 0);
            const range = Math.max(...values) - Math.min(...values);
            if (range < 0.75) {
                issues.push({
                    severity: "error",
                    code: "INSUFFICIENT_PRIMARY_RANGE",
                    message: `${scene.slotId}/${axis} range is ${range.toFixed(2)} (<0.75)`,
                    slotId: scene.slotId
                });
            }
        }
        for (const item of scene.choices) {
            if (globalChoiceIds.has(item.id)) {
                issues.push({ severity: "error", code: "DUPLICATE_CHOICE_ID", message: `Duplicate choice id ${item.id}`, slotId: scene.slotId, choiceId: item.id });
            }
            globalChoiceIds.add(item.id);
            for (const [axis, weight] of Object.entries(item.diagnosticWeights)) {
                if (!DIAGNOSTIC_AXES.includes(axis)) {
                    issues.push({ severity: "error", code: "UNKNOWN_AXIS", message: `Unknown axis ${axis}`, slotId: scene.slotId, choiceId: item.id });
                }
                if (!ALLOWED_WEIGHTS.has(weight)) {
                    issues.push({ severity: "error", code: "INVALID_WEIGHT", message: `Invalid weight ${weight} in ${item.id}`, slotId: scene.slotId, choiceId: item.id });
                }
            }
            if (item.usesDice && (item.diceThreshold === undefined || item.diceThreshold < 1 || item.diceThreshold > 100)) {
                issues.push({ severity: "error", code: "INVALID_DICE_THRESHOLD", message: `Invalid dice threshold in ${item.id}`, slotId: scene.slotId, choiceId: item.id });
            }
            if (!item.usesDice && item.diceEffects) {
                issues.push({ severity: "error", code: "DICE_EFFECT_WITHOUT_DICE", message: `${item.id} has diceEffects without usesDice`, slotId: scene.slotId, choiceId: item.id });
            }
            for (const effect of item.effects)
                validateEffect(effect, issues, scene.slotId, item.id);
            for (const effect of item.diceEffects?.success ?? [])
                validateEffect(effect, issues, scene.slotId, item.id);
            for (const effect of item.diceEffects?.failure ?? [])
                validateEffect(effect, issues, scene.slotId, item.id);
            for (const option of item.followUp?.options ?? []) {
                for (const effect of option.effects)
                    validateEffect(effect, issues, scene.slotId, item.id);
            }
        }
        for (const variant of scene.variants) {
            if (globalVariantIds.has(variant.id)) {
                issues.push({ severity: "error", code: "DUPLICATE_VARIANT_ID", message: `Duplicate scene variant id ${variant.id}`, slotId: scene.slotId });
            }
            globalVariantIds.add(variant.id);
        }
    }
    const baseSceneCounts = Object.fromEntries(DIAGNOSTIC_AXES.map((axis) => [axis, 0]));
    for (const scene of SCENES.filter((item) => item.slotId.startsWith("M"))) {
        baseSceneCounts[scene.primaryAxes[0]] += 1;
        baseSceneCounts[scene.primaryAxes[1]] += 1;
    }
    for (const axis of ["STR", "CON", "SIZ", "DEX", "APP", "INT", "POW", "EDU"]) {
        if (baseSceneCounts[axis] !== 4) {
            issues.push({ severity: "error", code: "PRIMARY_COVERAGE", message: `${axis} appears in M-slots ${baseSceneCounts[axis]} times, expected 4` });
        }
    }
    if (SCENES.filter((item) => item.slotId.startsWith("S") && item.primaryAxes.includes("SAN_DEPTH")).length !== 4) {
        issues.push({ severity: "error", code: "SAN_COVERAGE", message: "SAN_DEPTH must be measured in all four S-slots" });
    }
    if (SCENES.filter((item) => item.slotId.startsWith("L") && item.primaryAxes.includes("LUCK")).length !== 4) {
        issues.push({ severity: "error", code: "LUCK_COVERAGE", message: "LUCK must be measured in all four L-slots" });
    }
    const flowSlotIds = FLOW_NODES.flatMap((node) => node.slotId ? [node.slotId] : []);
    if (JSON.stringify(flowSlotIds) !== JSON.stringify(MEASUREMENT_ORDER)) {
        issues.push({ severity: "error", code: "FLOW_SLOT_ORDER", message: "Flow graph slot sequence differs from MEASUREMENT_ORDER" });
    }
    const nodeIds = new Set(FLOW_NODES.map((node) => node.id));
    for (const edge of FLOW_EDGES) {
        if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
            issues.push({ severity: "error", code: "FLOW_DANGLING_EDGE", message: `Dangling flow edge ${edge.from} -> ${edge.to}` });
        }
    }
    if (flowFileContent !== undefined && flowFileContent !== renderMermaid()) {
        issues.push({ severity: "error", code: "MERMAID_DRIFT", message: "docs/flow.mmd differs from generated FLOW_GRAPH" });
    }
    return issues;
}
export function validateRuntimeStateInvariants(state) {
    const violations = [];
    if (state.kuramochi.multipleFixation && state.kuramochi.fixedVariant !== null) {
        violations.push("multipleFixation and fixedVariant cannot coexist");
    }
    if (state.kuramochi.multipleFixation && state.mythos.houndStage !== 3) {
        violations.push("multiple fixation must result in H3");
    }
    if (state.kuramochi.fixedVariant !== null && state.kuramochi.state !== "fixed") {
        violations.push("fixedVariant requires kuramochi.state=fixed");
    }
    if (state.mythos.houndStage < 0 || state.mythos.houndStage > 3) {
        violations.push(`invalid hound stage ${state.mythos.houndStage}`);
    }
    if (state.mythos.houndStage === 3 && !state.mythos.fullManifestationOccurred && !state.kuramochi.multipleFixation) {
        violations.push("H3 requires full manifestation or multiple fixation");
    }
    if (state.observer.observerLink === "unlinked" && state.history.length > 0) {
        violations.push("observer link must be established after M03");
    }
    if (state.story.currentSlot === "S02" && state.history.length > 24) {
        violations.push("base flow exceeded 24 scored scenes");
    }
    return violations;
}
//# sourceMappingURL=validators.js.map
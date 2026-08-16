import { determineEnding, ENDINGS } from "./endings.js";
import { applyChoiceForExploration, resolveScene } from "./engine.js";
import { createInitialState } from "./initialState.js";
import { MEASUREMENT_ORDER, NETWORK_CLUES, SEAL_CLUES, STOP_CLUES } from "./constants.js";
import { validateRuntimeStateInvariants } from "./validators.js";
import type { AppState, EndingId, ExplorationReport } from "./types.js";

interface WeightedState {
  state: AppState;
  pathCount: bigint;
}

function cappedCount(state: AppState, registry: Set<string>, cap: number): number {
  return Math.min(cap, state.story.clues.filter((clue) => registry.has(clue)).length);
}

function fixationVector(state: AppState): [number, number, number] {
  const clues = new Set(state.story.clues);
  const a = ["kuramochi_pre_observation_memory", "fuyushiro_shutdown_notes", "observer_reaction_rule", "single_fixation_blueprint"]
    .filter((clue) => clues.has(clue)).length;
  const b = ["kuramochi_injury_continuity", "kuramochi_personal_item", "kuramochi_shared_physiology", "safe_exit_route"]
    .filter((clue) => clues.has(clue)).length;
  const c = ["sakaki_private_phrase", "kuramochi_sakaki_memory", "kuramochi_audio_match"]
    .filter((clue) => clues.has(clue)).length;
  return [Math.min(3, a), Math.min(3, b), Math.min(3, c)];
}

function timeBucket(value: number): string {
  if (value <= 0) return "expired";
  if (value <= 3) return "low";
  return "available";
}

function abstractStateKey(state: AppState, step: number): string {
  const keyFlags = [
    "emergency_overload_applied",
    "network_sever_attempt",
    "combined_rescue_network_attempt",
    "other_facilities_warned",
    "shared_memory_cost_accepted",
    "fixation_policy_preserve_relation",
    "body_continuity_fixation",
    "curved_exit_used",
    "complete_reseal",
    "limited_reseal",
    "building_destroyed_unplanned"
  ].filter((flag) => state.story.flags.includes(flag));

  const conditionalClues: string[] = [];
  // Keep only clues that can still alter a future Scene variant.
  if (step < 5 && state.story.clues.includes("old_floor_plan")) conditionalClues.push("old_floor_plan");
  if (step < 9 && state.story.clues.includes("normalized_clock_in_curve")) conditionalClues.push("normalized_clock_in_curve");
  if (step < 16 && state.story.clues.includes("hidden_room_measurement")) conditionalClues.push("hidden_room_measurement");
  if (step < 17 && state.story.clues.includes("fuyushiro_shutdown_notes")) conditionalClues.push("fuyushiro_shutdown_notes");

  const routes: Record<string, unknown> = {};
  if (step < 3) routes.lead = state.story.routes.lead;
  if (step < 12) routes.echo = state.story.routes.echo;
  if (step < 21) routes.finalScope = state.story.routes.finalScope;

  const inventoryConditions: string[] = [];
  if (step < 15 && state.story.inventory.includes("metal_tag")) inventoryConditions.push("metal_tag");
  if (step < 16 && state.story.inventory.includes("curved_panel_fragment")) inventoryConditions.push("curved_panel_fragment");

  return JSON.stringify({
    slot: state.story.currentSlot,
    historyLength: step,
    time: step <= 10 ? Math.max(-1, Math.min(12, state.story.timeUnits)) : timeBucket(state.story.timeUnits),
    companion: step < 22 ? state.story.companion : undefined,
    routes,
    keyFlags,
    conditionalClues,
    inventoryConditions,
    capabilities: {
      stopReady: cappedCount(state, STOP_CLUES, 2) >= 2,
      sealReady: cappedCount(state, SEAL_CLUES, 2) >= 2,
      networkLevel: cappedCount(state, NETWORK_CLUES, 3),
      fixationBest: Math.max(...fixationVector(state)) >= 3 ? "stable" : Math.max(...fixationVector(state)) >= 2 ? "near" : "weak"
    },
    observer: {
      state: state.observer.state,
      power: state.observer.emergencyPowerState,
      network: state.observer.angleNetworkState
    },
    mythos: {
      stage: state.mythos.houndStage,
      manifestation: Math.min(2, state.mythos.houndManifestation),
      full: state.mythos.fullManifestationOccurred
    },
    kuramochi: {
      state: state.kuramochi.state,
      first: step >= 22 ? state.kuramochi.firstInformationSource : null,
      fixed: state.kuramochi.fixedVariant,
      stability: Math.min(5, state.kuramochi.fixationStability),
      multiple: state.kuramochi.multipleFixation
    }
  });
}

function diceRepresentatives(choice: ReturnType<typeof resolveScene>["choices"][number]): Array<number | undefined> {
  if (!choice.usesDice) return [undefined];
  if (choice.id === "L04_random") return [1, 34, 67];
  if ((choice.diceThreshold ?? 100) >= 100) return [1];
  return [1, 100];
}

function followUpIds(choice: ReturnType<typeof resolveScene>["choices"][number]): Array<string | undefined> {
  return choice.followUp ? choice.followUp.options.map((option) => option.id) : [undefined];
}

export function exploreAllAbstractPaths(): ExplorationReport {
  let frontier = new Map<string, WeightedState>();
  const initial = createInitialState("path-explorer");
  frontier.set(abstractStateKey(initial, 0), { state: initial, pathCount: 1n });

  const reachedSlots = new Set<string>();
  const reachedVariants = new Set<string>();
  const exercisedChoices = new Set<string>();
  const deadEnds: string[] = [];
  const invariantViolations = new Set<string>();
  const endingCounts = Object.fromEntries(Object.keys(ENDINGS).map((id) => [id, 0n])) as Record<EndingId, bigint>;
  let totalAbstractVisited = 1;
  let terminalAbstractStates = 0;

  for (let step = 0; step < MEASUREMENT_ORDER.length; step += 1) {
    if ((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.DEBUG_EXPLORE === "1") {
      console.error(`step ${step + 1}/${MEASUREMENT_ORDER.length}: frontier=${frontier.size}`);
    }
    const nextFrontier = new Map<string, WeightedState>();

    for (const { state, pathCount } of frontier.values()) {
      const scene = resolveScene(state);
      reachedSlots.add(scene.slotId);
      reachedVariants.add(scene.sceneVariantId);

      if (scene.choices.length === 0) {
        deadEnds.push(`${scene.slotId}/${scene.sceneVariantId}: no visible choices`);
        continue;
      }

      for (const choice of scene.choices) {
        exercisedChoices.add(choice.id);
        for (const followUp of followUpIds(choice)) {
          for (const roll of diceRepresentatives(choice)) {
            try {
              const nextState = applyChoiceForExploration(state, choice.id, followUp, roll);
              for (const violation of validateRuntimeStateInvariants(nextState)) {
                invariantViolations.add(`${scene.slotId}/${choice.id}: ${violation}`);
              }

              if (step === MEASUREMENT_ORDER.length - 1) {
                const ending = determineEnding(nextState);
                endingCounts[ending.id] += pathCount;
                terminalAbstractStates += 1;
                continue;
              }

              const key = abstractStateKey(nextState, step + 1);
              const existing = nextFrontier.get(key);
              if (existing) {
                existing.pathCount += pathCount;
              } else {
                nextFrontier.set(key, { state: nextState, pathCount });
              }
            } catch (error) {
              deadEnds.push(`${scene.slotId}/${choice.id}: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
        }
      }
    }

    totalAbstractVisited += nextFrontier.size;
    frontier = nextFrontier;
  }

  const representedConcretePathCount = Object.values(endingCounts).reduce((sum, value) => sum + value, 0n);
  return {
    abstractStatesVisited: totalAbstractVisited,
    terminalAbstractStates,
    representedConcretePathCount: representedConcretePathCount.toString(),
    reachedSlots: [...reachedSlots] as never,
    reachedSceneVariants: [...reachedVariants].sort(),
    exercisedChoiceIds: [...exercisedChoices].sort(),
    endings: Object.fromEntries(
      Object.entries(endingCounts).map(([id, count]) => [id, count.toString()])
    ) as Record<EndingId, string>,
    deadEnds,
    invariantViolations: [...invariantViolations]
  };
}

export function renderExplorationReport(report: ExplorationReport): string {
  const endingLines = Object.entries(report.endings)
    .map(([id, count]) => `- ${id}: ${count}`)
    .join("\n");
  return `# 全経路・抽象状態探索レポート\n\n` +
    `- 探索した抽象状態数: ${report.abstractStatesVisited}\n` +
    `- 終端抽象状態数: ${report.terminalAbstractStates}\n` +
    `- 等価統合前の分岐重み（参考値）: ${report.representedConcretePathCount}\n` +
    `- 到達測定スロット数: ${report.reachedSlots.length}/24\n` +
    `- 到達Scene変種数: ${report.reachedSceneVariants.length}\n` +
    `- 実行した選択肢数: ${report.exercisedChoiceIds.length}\n\n` +
    `> 手掛かり閾値・終幕条件・Scene変種が同じ状態を統合しているため、分岐重みは厳密な一意回答列数ではありません。到達性と矛盾検査に使用します。\n\n` +
    `## エンディング到達数\n\n${endingLines}\n\n` +
    `## 行き止まり\n\n${report.deadEnds.length ? report.deadEnds.map((item) => `- ${item}`).join("\n") : "なし"}\n\n` +
    `## 状態不変条件違反\n\n${report.invariantViolations.length ? report.invariantViolations.map((item) => `- ${item}`).join("\n") : "なし"}\n`;
}

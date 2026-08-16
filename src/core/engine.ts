import { KURAMOCHI_CARDS } from "./cards.js";
import {
  FIXATION_CLUES,
  MEASUREMENT_ORDER,
  NETWORK_CLUES,
  SEAL_CLUES,
  STOP_CLUES
} from "./constants.js";
import { SCENE_BY_SLOT, SCENES } from "./scenes.js";
import { applyDiagnosticObservations, computeChoiceObservations } from "./scoring.js";
import type {
  AppState,
  ChoiceDefinition,
  Condition,
  FollowUpOption,
  KuramochiVariantId,
  MeasurementSlotId,
  ResolvedScene,
  SceneDefinition,
  StateEffect
} from "./types.js";

export interface ApplyChoiceResult {
  state: AppState;
  scene: ResolvedScene;
  choice: ChoiceDefinition;
  followUpOption?: FollowUpOption;
  diceRoll?: number;
  diceSuccess?: boolean;
}

export function cloneState(state: AppState): AppState {
  return structuredClone(state);
}

function valueAtPath(root: unknown, path: string): unknown {
  let current: unknown = root;
  for (const part of path.split(".")) {
    if (typeof current !== "object" || current === null || !(part in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function setValueAtPath(root: unknown, path: string, value: unknown): void {
  const parts = path.split(".");
  let current = root as Record<string, unknown>;
  for (const part of parts.slice(0, -1)) {
    const next = current[part];
    if (typeof next !== "object" || next === null) {
      throw new Error(`Invalid state path: ${path}`);
    }
    current = next as Record<string, unknown>;
  }
  const last = parts.at(-1);
  if (!last) {
    throw new Error(`Invalid empty state path: ${path}`);
  }
  current[last] = value;
}

function incrementValueAtPath(root: unknown, path: string, delta: number): void {
  const current = valueAtPath(root, path);
  if (typeof current !== "number") {
    throw new Error(`State path is not numeric: ${path}`);
  }
  setValueAtPath(root, path, current + delta);
}

function modifyCollection(root: unknown, path: string, value: string, addValue: boolean): void {
  const current = valueAtPath(root, path);
  if (!Array.isArray(current)) {
    throw new Error(`State path is not an array: ${path}`);
  }
  const values = current as string[];
  if (addValue) {
    if (!values.includes(value)) {
      values.push(value);
    }
  } else {
    const index = values.indexOf(value);
    if (index >= 0) {
      values.splice(index, 1);
    }
  }
}

export function conditionMatches(state: AppState, condition: Condition): boolean {
  const present = condition.type === "flag" || condition.type === "clue" || condition.type === "inventory"
    ? condition.present ?? true
    : true;

  switch (condition.type) {
    case "flag":
      return state.story.flags.includes(condition.value) === present;
    case "clue":
      return state.story.clues.includes(condition.value) === present;
    case "inventory":
      return state.story.inventory.includes(condition.value) === present;
    case "companion":
      return state.story.companion === condition.value;
    case "route":
      return state.story.routes[condition.route] === condition.value;
    case "houndStageAtLeast":
      return state.mythos.houndStage >= condition.value;
    case "houndStageAtMost":
      return state.mythos.houndStage <= condition.value;
    case "timeAtMost":
      return state.story.timeUnits <= condition.value;
    case "timeAtLeast":
      return state.story.timeUnits >= condition.value;
    case "observerState":
      return state.observer.state === condition.value;
    case "networkState":
      return state.observer.angleNetworkState === condition.value;
    case "kuramochiFirstInfo":
      return state.kuramochi.firstInformationSource === condition.value;
  }
}

function allConditionsMatch(state: AppState, conditions: readonly Condition[] | undefined): boolean {
  return (conditions ?? []).every((condition) => conditionMatches(state, condition));
}

function interpolate(text: string, state: AppState): string {
  const fallback = "選ばなかった別の行動を取る自分が、こちらより先に雨声荘へ到達している";
  return text
    .replaceAll("{{UNCHOSEN_ACT1}}", state.story.salientUnchosenActions.act1 ?? fallback)
    .replaceAll("{{UNCHOSEN_ACT2}}", state.story.salientUnchosenActions.act2 ?? fallback)
    .replaceAll("{{UNCHOSEN_ACT3}}", state.story.salientUnchosenActions.act3 ?? fallback)
    .replaceAll("{{UNCHOSEN_ACT4}}", state.story.salientUnchosenActions.act4 ?? fallback);
}

export function resolveScene(state: AppState, slotId = state.story.currentSlot): ResolvedScene {
  if (!(slotId in SCENE_BY_SLOT)) {
    throw new Error(`No base scene for slot ${slotId}`);
  }
  const base = SCENE_BY_SLOT[slotId as MeasurementSlotId];
  const matching = base.variants
    .filter((variant) => allConditionsMatch(state, variant.conditions))
    .sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0));
  const variant = matching[0];

  const visibleChoices = base.choices
    .filter((candidate) => allConditionsMatch(state, candidate.conditions))
    .map((candidate) => {
      const override = variant?.choiceOverrides?.[candidate.id];
      return {
        ...candidate,
        ...(override?.label !== undefined ? { label: override.label } : {}),
        ...(override?.detail !== undefined ? { detail: override.detail } : {}),
        ...(override?.outcome !== undefined ? { outcome: override.outcome } : {})
      };
    });

  const bodyParts = [variant?.bodyPrefix, variant?.body ?? base.body, variant?.bodySuffix]
    .filter((part): part is string => Boolean(part));

  return {
    slotId: base.slotId,
    act: base.act,
    title: base.title,
    primaryAxes: base.primaryAxes,
    ui: base.ui,
    body: interpolate(bodyParts.join("\n\n"), state),
    ...(base.constraint !== undefined ? { constraint: interpolate(base.constraint, state) } : {}),
    choices: visibleChoices.map((candidate) => ({
      ...candidate,
      label: interpolate(candidate.label, state),
      ...(candidate.detail !== undefined ? { detail: interpolate(candidate.detail, state) } : {}),
      outcome: interpolate(candidate.outcome, state)
    })),
    ...(base.recordUnchosenAct !== undefined ? { recordUnchosenAct: base.recordUnchosenAct } : {}),
    sceneVariantId: variant?.id ?? `${base.slotId}_neutral`
  };
}

function hash32(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function deterministicD100(state: AppState, slotId: string, choiceId: string): number {
  const occurrence = state.history.filter((entry) => entry.slotId === slotId).length;
  const value = hash32(`${state.sessionSeed}:${slotId}:${choiceId}:${occurrence}`);
  return (value % 100) + 1;
}

function kuramochiProbeScores(state: AppState): Record<KuramochiVariantId, number> {
  const clues = new Set(state.story.clues);
  return {
    A: ["fuyushiro_shutdown_notes", "single_fixation_blueprint", "kuramochi_pre_observation_memory", "observer_reaction_rule"]
      .filter((clue) => clues.has(clue)).length,
    B: ["kuramochi_injury_continuity", "kuramochi_personal_item", "kuramochi_shared_physiology", "safe_exit_route"]
      .filter((clue) => clues.has(clue)).length,
    C: ["sakaki_private_phrase", "kuramochi_sakaki_memory", "kuramochi_audio_match"]
      .filter((clue) => clues.has(clue)).length
  };
}

function selectKuramochiVariant(
  state: AppState,
  strategy: "random" | "strongest" | "probe" | "companion",
  diceRoll?: number
): KuramochiVariantId {
  if (strategy === "strongest") {
    return "A";
  }
  if (strategy === "companion") {
    return state.story.companion === "sumie_present" || state.story.companion === "sumie_remote" ? "B" : "C";
  }
  if (strategy === "probe") {
    const scores = kuramochiProbeScores(state);
    const ordered: KuramochiVariantId[] = ["A", "B", "C"];
    return ordered.sort((left, right) => scores[right] - scores[left])[0] ?? "A";
  }
  const roll = diceRoll ?? ((hash32(`${state.sessionSeed}:L04:random`) % 100) + 1);
  if (roll <= 33) return "A";
  if (roll <= 66) return "B";
  return "C";
}

function addKuramochiInformation(state: AppState, variant: KuramochiVariantId): void {
  state.kuramochi.firstInformationSource ??= variant;
  state.kuramochi.variants[variant].visible = true;
  state.kuramochi.variants[variant].contacted = true;
  const card = KURAMOCHI_CARDS[variant];
  if (!state.story.clues.includes(card.firstContactClue)) {
    state.story.clues.push(card.firstContactClue);
  }

  const additional: Record<KuramochiVariantId, string[]> = {
    A: ["fuyushiro_shutdown_notes", "single_fixation_blueprint"],
    B: ["kuramochi_personal_item", "safe_exit_route"],
    C: ["kuramochi_audio_match", "kuramochi_sakaki_memory"]
  };
  for (const clue of additional[variant]) {
    if (!state.story.clues.includes(clue)) {
      state.story.clues.push(clue);
    }
    if (!state.kuramochi.variants[variant].clues.includes(clue)) {
      state.kuramochi.variants[variant].clues.push(clue);
    }
  }
}

function applyEffect(state: AppState, effect: StateEffect, diceRoll?: number): void {
  switch (effect.op) {
    case "inc":
      incrementValueAtPath(state, effect.path, effect.value);
      break;
    case "set":
      setValueAtPath(state, effect.path, effect.value);
      break;
    case "add":
      modifyCollection(state, effect.path, effect.value, true);
      break;
    case "remove":
      modifyCollection(state, effect.path, effect.value, false);
      break;
    case "revealKuramochi":
      state.kuramochi.variants[effect.variant].visible = true;
      break;
    case "contactKuramochi":
      state.kuramochi.variants[effect.variant].visible = true;
      state.kuramochi.variants[effect.variant].contacted = true;
      break;
    case "fixKuramochi":
      state.kuramochi.fixedVariant = effect.variant;
      state.kuramochi.state = "fixed";
      break;
    case "enableMultipleFixation":
      state.kuramochi.multipleFixation = true;
      state.kuramochi.fixedVariant = null;
      state.kuramochi.state = "fixed";
      break;
    case "selectKuramochiInfo": {
      const variant = selectKuramochiVariant(state, effect.strategy, diceRoll);
      addKuramochiInformation(state, variant);
      break;
    }
  }
}

function countKnown(state: AppState, registry: Set<string>): number {
  return state.story.clues.filter((clue) => registry.has(clue)).length;
}

function recalculateFixationStability(state: AppState): void {
  const variant = state.kuramochi.fixedVariant;
  if (!variant) {
    if (!state.kuramochi.multipleFixation) {
      state.kuramochi.fixationStability = 0;
    }
    return;
  }

  const clues = new Set(state.story.clues);
  const common = ["kuramochi_shared_physiology", "single_fixation_blueprint"];
  const specific: Record<KuramochiVariantId, string[]> = {
    A: ["kuramochi_pre_observation_memory", "fuyushiro_shutdown_notes", "observer_reaction_rule"],
    B: ["kuramochi_injury_continuity", "kuramochi_personal_item", "safe_exit_route"],
    C: ["sakaki_private_phrase", "kuramochi_sakaki_memory", "kuramochi_audio_match"]
  };

  let stability = [...common, ...specific[variant]].filter((clue) => clues.has(clue)).length;
  if (state.story.flags.includes("shared_memory_cost_accepted")) stability += 1;
  if (state.story.flags.includes("fixation_policy_preserve_relation") && stability >= 2) stability += 1;
  if (state.story.flags.includes("body_continuity_fixation") && variant === "B") stability += 1;
  state.kuramochi.fixationStability = Math.min(5, stability);
}

function normalizeNetworkState(state: AppState): void {
  const count = countKnown(state, NETWORK_CLUES);
  const attempted = state.story.flags.includes("network_sever_attempt") || state.story.flags.includes("combined_rescue_network_attempt");

  if (attempted && count >= 3) {
    state.observer.angleNetworkState = "severed";
    return;
  }
  if (attempted) {
    state.observer.angleNetworkState = "partially_severed";
    return;
  }

  if (
    state.story.flags.includes("other_facilities_warned") &&
    count >= 2 &&
    ["resealed", "stopped"].includes(state.observer.state)
  ) {
    state.observer.angleNetworkState = "contained";
  }
}

function normalizeHoundState(state: AppState): void {
  if (state.kuramochi.multipleFixation) {
    state.mythos.houndStage = 3;
    state.mythos.fullManifestationOccurred = true;
  }
  if (state.mythos.blueIchorContact || state.mythos.fullManifestationOccurred) {
    state.mythos.houndStage = 3;
  }
  if (state.mythos.houndManifestation >= 2) {
    state.mythos.houndStage = 3;
    state.mythos.fullManifestationOccurred = true;
  }
  if (state.observer.state === "destroyed_badly" && state.mythos.houndStage < 2) {
    state.mythos.houndStage = 2;
  }
}

function applyDeadlineIfNeeded(state: AppState): void {
  if (
    state.story.timeUnits > 0 ||
    state.observer.emergencyPowerState !== "scheduled" ||
    state.story.flags.includes("emergency_overload_applied")
  ) {
    return;
  }

  state.observer.emergencyPowerState = "triggered";
  if (!["stopped", "resealed"].includes(state.observer.state)) {
    state.observer.state = "overload";
  }
  state.story.flags.push("emergency_overload_applied");
  state.mythos.houndPressure += 2;
  state.mythos.houndManifestation += 1;

  if (state.story.location === "observation_room") {
    state.mythos.houndStage = 3;
    state.mythos.fullManifestationOccurred = true;
    if (!state.mythos.markedCharacters.includes("player")) {
      state.mythos.markedCharacters.push("player");
    }
  }
}

function postSceneUpdates(state: AppState, slotId: MeasurementSlotId): void {
  switch (slotId) {
    case "M03":
      state.observer.observerLink = "reference_linked";
      break;
    case "M05":
      state.story.location = "second_floor_north";
      break;
    case "L03":
      state.story.location = "underground_laundry";
      break;
    case "M10":
      state.observer.state = state.observer.state === "overload" ? "overload" : "superposition";
      break;
    case "M15":
      state.story.location = "observation_room";
      if (state.observer.emergencyPowerState === "triggered") {
        state.mythos.houndStage = 3;
        state.mythos.fullManifestationOccurred = true;
        if (!state.mythos.markedCharacters.includes("player")) {
          state.mythos.markedCharacters.push("player");
        }
      }
      break;
    case "S04":
      state.kuramochi.state = "information_acquired";
      state.kuramochi.variants.A.visible = true;
      state.kuramochi.variants.B.visible = true;
      state.kuramochi.variants.C.visible = true;
      break;
    case "S03":
      recalculateFixationStability(state);
      break;
    case "S02": {
      const stopCount = countKnown(state, STOP_CLUES);
      const sealCount = countKnown(state, SEAL_CLUES);
      if (state.observer.state === "resealed" && stopCount >= 2) {
        state.observer.oscillatorState = "stopped";
        state.observer.emergencyPowerState = "stopped";
      }
      if (state.observer.state === "resealed" && sealCount >= 2) {
        state.story.roundedSafety += 1;
      }
      normalizeNetworkState(state);
      break;
    }
  }

  applyDeadlineIfNeeded(state);
  normalizeNetworkState(state);
  normalizeHoundState(state);
  recalculateFixationStability(state);
}

function recordSalientUnchosen(
  state: AppState,
  scene: ResolvedScene,
  selectedChoiceId: string
): void {
  if (!scene.recordUnchosenAct) {
    return;
  }
  const candidate = scene.choices
    .filter((choice) => choice.id !== selectedChoiceId)
    .sort((left, right) => (right.salience ?? 0) - (left.salience ?? 0))[0];
  if (!candidate) {
    return;
  }
  const key = `act${scene.recordUnchosenAct}` as keyof AppState["story"]["salientUnchosenActions"];
  state.story.salientUnchosenActions[key] = candidate.label;
}

function nextMeasurementSlot(slotId: MeasurementSlotId): MeasurementSlotId | null {
  const index = MEASUREMENT_ORDER.indexOf(slotId);
  return index >= 0 && index + 1 < MEASUREMENT_ORDER.length
    ? MEASUREMENT_ORDER[index + 1] ?? null
    : null;
}

function stableHash(state: AppState): string {
  const compact = JSON.stringify({
    story: state.story,
    observer: state.observer,
    mythos: state.mythos,
    kuramochi: state.kuramochi
  });
  return hash32(compact).toString(16).padStart(8, "0");
}

export function applyChoice(
  inputState: AppState,
  choiceId: string,
  followUpOptionId?: string,
  diceRollOverride?: number
): ApplyChoiceResult {
  const state = cloneState(inputState);
  const scene = resolveScene(state);
  const choice = scene.choices.find((candidate) => candidate.id === choiceId);
  if (!choice) {
    throw new Error(`Choice ${choiceId} is not visible in ${scene.slotId}/${scene.sceneVariantId}`);
  }

  const observations = computeChoiceObservations(scene, scene.choices, choice);
  applyDiagnosticObservations(state, observations);

  let diceRoll: number | undefined;
  let diceSuccess: boolean | undefined;
  if (choice.usesDice) {
    diceRoll = diceRollOverride ?? deterministicD100(state, scene.slotId, choice.id);
    diceSuccess = diceRoll <= (choice.diceThreshold ?? 100);
  }

  for (const effect of choice.effects) {
    applyEffect(state, effect, diceRoll);
  }
  if (choice.diceEffects && diceSuccess !== undefined) {
    for (const effect of diceSuccess ? choice.diceEffects.success : choice.diceEffects.failure) {
      applyEffect(state, effect, diceRoll);
    }
  }

  let followUpOption: FollowUpOption | undefined;
  if (choice.followUp) {
    if (!followUpOptionId) {
      throw new Error(`Choice ${choice.id} requires an unscored follow-up selection`);
    }
    followUpOption = choice.followUp.options.find((option) => option.id === followUpOptionId);
    if (!followUpOption) {
      throw new Error(`Invalid follow-up option ${followUpOptionId} for ${choice.id}`);
    }
    for (const effect of followUpOption.effects) {
      applyEffect(state, effect, diceRoll);
    }
  }

  recordSalientUnchosen(state, scene, choice.id);
  postSceneUpdates(state, scene.slotId);

  const next = nextMeasurementSlot(scene.slotId);
  if (next) {
    state.story.currentSlot = next;
    state.story.act = SCENE_BY_SLOT[next].act;
  }

  state.history.push({
    slotId: scene.slotId,
    sceneVariantId: scene.sceneVariantId,
    visibleChoiceIds: scene.choices.map((candidate) => candidate.id),
    selectedChoiceId: choice.id,
    ...(diceRoll !== undefined ? { diceRoll } : {}),
    snapshotHash: stableHash(state)
  });

  return {
    state,
    scene,
    choice,
    ...(followUpOption !== undefined ? { followUpOption } : {}),
    ...(diceRoll !== undefined && diceSuccess !== undefined ? { diceRoll, diceSuccess } : {})
  };
}

export function allScenes(): readonly SceneDefinition[] {
  return SCENES;
}

export function fixationClueCount(state: AppState): number {
  return countKnown(state, FIXATION_CLUES);
}

export function stopClueCount(state: AppState): number {
  return countKnown(state, STOP_CLUES);
}

export function sealClueCount(state: AppState): number {
  return countKnown(state, SEAL_CLUES);
}

export function networkClueCount(state: AppState): number {
  return countKnown(state, NETWORK_CLUES);
}

/**
 * Lightweight transition used by exhaustive graph exploration.
 * It intentionally skips diagnostic accumulation, rendered text, snapshot hashing and UI history.
 * Story, Mythos, apparatus, clue and ending-relevant transitions are identical to applyChoice().
 */
export function applyChoiceForExploration(
  inputState: AppState,
  choiceId: string,
  followUpOptionId?: string,
  diceRollOverride?: number
): AppState {
  const state = cloneState(inputState);
  const slotId = state.story.currentSlot as MeasurementSlotId;
  const base = SCENE_BY_SLOT[slotId];
  const visibleChoices = base.choices.filter((candidate) => allConditionsMatch(state, candidate.conditions));
  const selected = visibleChoices.find((candidate) => candidate.id === choiceId);
  if (!selected) {
    throw new Error(`Choice ${choiceId} is not visible in ${slotId}`);
  }

  let diceRoll: number | undefined;
  let diceSuccess: boolean | undefined;
  if (selected.usesDice) {
    diceRoll = diceRollOverride ?? deterministicD100(state, slotId, selected.id);
    diceSuccess = diceRoll <= (selected.diceThreshold ?? 100);
  }

  for (const effect of selected.effects) {
    applyEffect(state, effect, diceRoll);
  }
  if (selected.diceEffects && diceSuccess !== undefined) {
    for (const effect of diceSuccess ? selected.diceEffects.success : selected.diceEffects.failure) {
      applyEffect(state, effect, diceRoll);
    }
  }

  if (selected.followUp) {
    if (!followUpOptionId) {
      throw new Error(`Choice ${selected.id} requires a follow-up`);
    }
    const followUp = selected.followUp.options.find((option) => option.id === followUpOptionId);
    if (!followUp) {
      throw new Error(`Invalid follow-up ${followUpOptionId} for ${selected.id}`);
    }
    for (const effect of followUp.effects) {
      applyEffect(state, effect, diceRoll);
    }
  }

  const pseudoResolved: ResolvedScene = {
    slotId: base.slotId,
    act: base.act,
    title: base.title,
    primaryAxes: base.primaryAxes,
    ui: base.ui,
    body: base.body,
    ...(base.constraint !== undefined ? { constraint: base.constraint } : {}),
    choices: visibleChoices,
    ...(base.recordUnchosenAct !== undefined ? { recordUnchosenAct: base.recordUnchosenAct } : {}),
    sceneVariantId: `${base.slotId}_exploration`
  };
  recordSalientUnchosen(state, pseudoResolved, selected.id);
  postSceneUpdates(state, slotId);

  const next = nextMeasurementSlot(slotId);
  if (next) {
    state.story.currentSlot = next;
    state.story.act = SCENE_BY_SLOT[next].act;
  }
  state.history = [];
  return state;
}

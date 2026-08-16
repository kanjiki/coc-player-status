import { determineEnding } from "./endings.js";
import { applyChoice } from "./engine.js";
import { createInitialState } from "./initialState.js";
import type { AppState, EndingId, MeasurementSlotId } from "./types.js";

export interface PlanStep {
  choiceId: string;
  followUpOptionId?: string;
  diceRoll?: number;
}

export type WitnessPlan = Record<MeasurementSlotId, PlanStep>;

const GOOD_PLAN: WitnessPlan = {
  M03: { choiceId: "M03_formal_log" },
  M01: { choiceId: "M01_ask_sakaki" },
  M06: { choiceId: "M06_network" },
  M02: { choiceId: "M02_preserve" },
  L02: { choiceId: "L02_infer_key" },
  M05: { choiceId: "M05_infer" },
  M09: { choiceId: "M09_talk" },
  M11: { choiceId: "M11_assign_role" },
  M04: { choiceId: "M04_slip_through" },
  L03: { choiceId: "L03_shortcut", diceRoll: 1 },
  M07: { choiceId: "M07_keep_plan" },
  M10: { choiceId: "M10_test" },
  S01: { choiceId: "S01_remote" },
  M08: { choiceId: "M08_record_and_move" },
  M12: { choiceId: "M12_ignore" },
  L01: { choiceId: "L01_random_step", diceRoll: 1 },
  M15: { choiceId: "M15_infer_room" },
  M14: { choiceId: "M14_use_notes" },
  S04: { choiceId: "S04_rescue_only" },
  M13: { choiceId: "M13_warn_network" },
  M16: { choiceId: "M16_network" },
  L04: { choiceId: "L04_companion" },
  S03: { choiceId: "S03_accept_memory_cost", followUpOptionId: "fix_c" },
  S02: { choiceId: "S02_complete_reseal" }
};

function withOverrides(overrides: Partial<WitnessPlan>): WitnessPlan {
  return { ...GOOD_PLAN, ...overrides };
}

export const ENDING_WITNESS_PLANS: Record<EndingId, WitnessPlan> = {
  ENDING_A_ANGLELESS_MORNING: GOOD_PLAN,
  ENDING_B_DIFFERENT_YESTERDAY: withOverrides({
    M03: { choiceId: "M03_quick_copy" },
    M01: { choiceId: "M01_analyze_phase" },
    M06: { choiceId: "M06_immediate" },
    M02: { choiceId: "M02_force" },
    L02: { choiceId: "L02_roll_now", diceRoll: 100 },
    M05: { choiceId: "M05_tap_walls" },
    M09: { choiceId: "M09_disable_local_system" },
    M11: { choiceId: "M11_assign_role" },
    M04: { choiceId: "M04_slip_through" },
    L03: { choiceId: "L03_shortcut", diceRoll: 1 },
    M07: { choiceId: "M07_keep_plan" },
    M10: { choiceId: "M10_use_route" },
    S01: { choiceId: "S01_isolate" },
    M08: { choiceId: "M08_record_and_move" },
    M12: { choiceId: "M12_ignore" },
    L01: { choiceId: "L01_build_footing" },
    M15: { choiceId: "M15_break_strongest" },
    M14: { choiceId: "M14_isolate_section" },
    S04: { choiceId: "S04_discard_record" },
    M13: { choiceId: "M13_local_now" },
    M16: { choiceId: "M16_local" },
    L04: { choiceId: "L04_strongest" },
    S03: { choiceId: "S03_body_only", followUpOptionId: "fix_a" },
    S02: { choiceId: "S02_retreat" }
  }),
  ENDING_C_EGGSHELL_PRISON: withOverrides({
    S03: { choiceId: "S03_no_fixation" },
    S02: { choiceId: "S02_complete_reseal" }
  }),
  ENDING_D_PURSUIT_CONTINUES: withOverrides({
    S01: { choiceId: "S01_direct" }
  }),
  ENDING_E_NOT_ONE_BUILDING: withOverrides({
    M16: { choiceId: "M16_local" },
    S03: { choiceId: "S03_no_fixation" },
    S02: { choiceId: "S02_retreat" }
  }),
  ENDING_F_MULTIPLE_UNCHOSEN: withOverrides({
    S03: { choiceId: "S03_multiple" }
  }),
  ENDING_G_TOMORROWS_RECORDING: withOverrides({
    M03: { choiceId: "M03_quick_copy" },
    M01: { choiceId: "M01_analyze_phase" },
    M06: { choiceId: "M06_immediate" },
    M02: { choiceId: "M02_limited" },
    L02: { choiceId: "L02_alternate" },
    M05: { choiceId: "M05_tap_walls" },
    M09: { choiceId: "M09_disable_local_system" },
    M11: { choiceId: "M11_assign_role" },
    M04: { choiceId: "M04_detour" },
    L03: { choiceId: "L03_curved_slope" },
    M07: { choiceId: "M07_keep_plan" },
    M10: { choiceId: "M10_test" },
    S01: { choiceId: "S01_isolate" },
    M08: { choiceId: "M08_deep_records" },
    M12: { choiceId: "M12_ignore" },
    L01: { choiceId: "L01_wait_pattern" },
    M15: { choiceId: "M15_use_blueprint_route" },
    M14: { choiceId: "M14_use_notes" },
    S04: { choiceId: "S04_rescue_only" },
    M13: { choiceId: "M13_local_now" },
    M16: { choiceId: "M16_local" },
    L04: { choiceId: "L04_companion" },
    S03: { choiceId: "S03_no_fixation" },
    S02: { choiceId: "S02_retreat" }
  })
};

export interface WitnessResult {
  expectedEnding: EndingId;
  actualEnding: EndingId;
  state: AppState;
  history: Array<{ slotId: string; choiceId: string; diceRoll?: number }>;
}

export function runWitnessPlan(expectedEnding: EndingId, plan: WitnessPlan): WitnessResult {
  let state = createInitialState(`witness:${expectedEnding}`);
  const history: WitnessResult["history"] = [];

  for (let index = 0; index < 24; index += 1) {
    const slotId = state.story.currentSlot as MeasurementSlotId;
    const step = plan[slotId];
    if (!step) throw new Error(`Witness ${expectedEnding} has no step for ${slotId}`);
    const result = applyChoice(state, step.choiceId, step.followUpOptionId, step.diceRoll);
    state = result.state;
    history.push({
      slotId,
      choiceId: step.choiceId,
      ...(result.diceRoll !== undefined ? { diceRoll: result.diceRoll } : {})
    });
  }

  const actualEnding = determineEnding(state).id;
  return { expectedEnding, actualEnding, state, history };
}

export function runAllEndingWitnesses(): WitnessResult[] {
  return Object.entries(ENDING_WITNESS_PLANS).map(([ending, plan]) =>
    runWitnessPlan(ending as EndingId, plan)
  );
}

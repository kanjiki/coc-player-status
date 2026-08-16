import { DIAGNOSTIC_AXES } from "./constants.js";
import type { AppState, DiagnosticAxisState, DiagnosticState } from "./types.js";

function createDiagnosticAxisState(): DiagnosticAxisState {
  return {
    evidenceSum: 0,
    informationSum: 0,
    validObservations: 0,
    primaryObservations: 0,
    evidenceHistory: []
  };
}

function createDiagnosticState(): DiagnosticState {
  return Object.fromEntries(
    DIAGNOSTIC_AXES.map((axis) => [axis, createDiagnosticAxisState()])
  ) as DiagnosticState;
}

export function createInitialState(sessionSeed = "demo-seed"): AppState {
  return {
    story: {
      act: 1,
      currentSlot: "M03",
      timeUnits: 12,
      location: "management_office",
      companion: "sakaki_remote",
      companionCondition: "stable",
      trust: { sakaki: 0, sumie: 0 },
      clues: [],
      inventory: [],
      flags: [],
      structuralDamage: 0,
      cornerBreaches: 0,
      roundedSafety: 0,
      routes: {
        lead: null,
        entry: null,
        basement: null,
        echo: null,
        transientDoor: null,
        finalScope: null
      },
      salientUnchosenActions: {
        act1: null,
        act2: null,
        act3: null,
        act4: null
      }
    },
    observer: {
      state: "active",
      phaseCycleMinutes: 17,
      observerLink: "unlinked",
      sakakiLinked: false,
      lensIntegrity: 100,
      oscillatorState: "active",
      emergencyPowerState: "scheduled",
      angleNetworkState: "unknown"
    },
    mythos: {
      houndStage: 1,
      houndPressure: 0,
      houndManifestation: 0,
      angularExposure: 0,
      markedCharacters: [],
      blueIchorContact: false,
      fullManifestationOccurred: false
    },
    kuramochi: {
      state: "superposed",
      variants: {
        A: { visible: false, contacted: false, clues: [] },
        B: { visible: false, contacted: false, clues: [] },
        C: { visible: false, contacted: false, clues: [] }
      },
      firstInformationSource: null,
      fixedVariant: null,
      fixationStability: 0,
      multipleFixation: false
    },
    diagnostic: createDiagnosticState(),
    history: [],
    sessionSeed
  };
}

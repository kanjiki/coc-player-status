export type MeasurementSlotId =
  | "M03" | "M01" | "M06" | "M02" | "L02"
  | "M05" | "M09" | "M11" | "M04" | "L03"
  | "M07" | "M10" | "S01" | "M08" | "M12" | "L01"
  | "M15" | "M14" | "S04" | "M13" | "M16" | "L04"
  | "S03" | "S02";

export type AdaptiveSlotId =
  | "A01" | "A02" | "A03" | "A04"
  | "A05" | "A06" | "A07" | "A08";

export type AnySlotId = MeasurementSlotId | AdaptiveSlotId;

export type DiagnosticAxis =
  | "STR" | "CON" | "SIZ" | "DEX"
  | "APP" | "INT" | "POW" | "EDU"
  | "SAN_DEPTH" | "LUCK";

export type BaseAbility = Exclude<DiagnosticAxis, "SAN_DEPTH" | "LUCK">;

export type ActNumber = 1 | 2 | 3 | 4 | 5;
export type HoundStage = 0 | 1 | 2 | 3;
export type KuramochiVariantId = "A" | "B" | "C";
export type CompanionId = "none" | "sakaki_remote" | "sumie_remote" | "sumie_present";
export type CompanionCondition = "stable" | "shaken" | "withdrawn" | "injured";

export type ObserverApparatusState =
  | "sealed"
  | "exposed"
  | "active"
  | "superposition"
  | "overload"
  | "stopped"
  | "resealed"
  | "partial"
  | "destroyed_badly";

export type ObserverLinkState = "unlinked" | "reference_linked";
export type OscillatorState = "off" | "active" | "stopped" | "damaged";
export type EmergencyPowerState = "scheduled" | "stopped" | "triggered";
export type AngleNetworkState =
  | "unknown"
  | "suspected"
  | "mapped"
  | "warned"
  | "partially_severed"
  | "severed"
  | "contained";

export type KuramochiSuperpositionState =
  | "single"
  | "echoes"
  | "superposed"
  | "information_acquired"
  | "fixed"
  | "unfixed";

export type LeadRoute = "sumie" | "records" | "network" | "immediate" | null;
export type EntryRoute = "preserve" | "force" | "limited" | "call" | null;
export type BasementRoute = "shortcut" | "curved_slope" | "reinforced" | "maintenance" | null;
export type EchoRoute = "keep_plan" | "follow" | "limited_follow" | "seal" | null;
export type TransientDoorRoute = "ignore" | "enter" | "probe" | "reproduce" | null;
export type FinalScope = "rescue" | "network" | "both" | "local" | null;

export interface StoryRoutes {
  lead: LeadRoute;
  entry: EntryRoute;
  basement: BasementRoute;
  echo: EchoRoute;
  transientDoor: TransientDoorRoute;
  finalScope: FinalScope;
}

export interface StoryState {
  act: ActNumber;
  currentSlot: AnySlotId;
  timeUnits: number;
  location: string;

  companion: CompanionId;
  companionCondition: CompanionCondition;
  trust: {
    sakaki: number;
    sumie: number;
  };

  clues: string[];
  inventory: string[];
  flags: string[];

  structuralDamage: number;
  cornerBreaches: number;
  roundedSafety: number;

  routes: StoryRoutes;

  salientUnchosenActions: {
    act1: string | null;
    act2: string | null;
    act3: string | null;
    act4: string | null;
  };
}

export interface ObserverState {
  state: ObserverApparatusState;
  phaseCycleMinutes: 17;
  observerLink: ObserverLinkState;
  sakakiLinked: boolean;

  lensIntegrity: number;
  oscillatorState: OscillatorState;
  emergencyPowerState: EmergencyPowerState;
  angleNetworkState: AngleNetworkState;
}

export interface MythosState {
  houndStage: HoundStage;
  houndPressure: number;
  houndManifestation: number;
  angularExposure: number;
  markedCharacters: string[];
  blueIchorContact: boolean;
  fullManifestationOccurred: boolean;
}

export interface KuramochiVariantState {
  visible: boolean;
  contacted: boolean;
  clues: string[];
}

export interface KuramochiState {
  state: KuramochiSuperpositionState;
  variants: Record<KuramochiVariantId, KuramochiVariantState>;
  firstInformationSource: KuramochiVariantId | null;
  fixedVariant: KuramochiVariantId | null;
  fixationStability: number;
  multipleFixation: boolean;
}

export interface DiagnosticAxisState {
  evidenceSum: number;
  informationSum: number;
  validObservations: number;
  primaryObservations: number;
  evidenceHistory: number[];
}

export type DiagnosticState = Record<DiagnosticAxis, DiagnosticAxisState>;

export interface HistoryEntry {
  slotId: AnySlotId;
  sceneVariantId: string;
  visibleChoiceIds: string[];
  selectedChoiceId: string;
  diceRoll?: number;
  snapshotHash: string;
}

export interface AppState {
  story: StoryState;
  observer: ObserverState;
  mythos: MythosState;
  kuramochi: KuramochiState;
  diagnostic: DiagnosticState;
  history: HistoryEntry[];
  sessionSeed: string;
}

export type DiagnosticWeights = Partial<Record<DiagnosticAxis, number>>;

export type Condition =
  | { type: "flag"; value: string; present?: boolean }
  | { type: "clue"; value: string; present?: boolean }
  | { type: "inventory"; value: string; present?: boolean }
  | { type: "companion"; value: CompanionId }
  | { type: "route"; route: keyof StoryRoutes; value: string | null }
  | { type: "houndStageAtLeast"; value: HoundStage }
  | { type: "houndStageAtMost"; value: HoundStage }
  | { type: "timeAtMost"; value: number }
  | { type: "timeAtLeast"; value: number }
  | { type: "observerState"; value: ObserverApparatusState }
  | { type: "networkState"; value: AngleNetworkState }
  | { type: "kuramochiFirstInfo"; value: KuramochiVariantId | null };

export type NumericStatePath =
  | "story.timeUnits"
  | "story.trust.sakaki"
  | "story.trust.sumie"
  | "story.structuralDamage"
  | "story.cornerBreaches"
  | "story.roundedSafety"
  | "observer.lensIntegrity"
  | "mythos.houndPressure"
  | "mythos.houndManifestation"
  | "mythos.angularExposure"
  | "kuramochi.fixationStability";

export type ScalarStatePath =
  | "story.act"
  | "story.currentSlot"
  | "story.location"
  | "story.companion"
  | "story.companionCondition"
  | "story.routes.lead"
  | "story.routes.entry"
  | "story.routes.basement"
  | "story.routes.echo"
  | "story.routes.transientDoor"
  | "story.routes.finalScope"
  | "observer.state"
  | "observer.observerLink"
  | "observer.sakakiLinked"
  | "observer.oscillatorState"
  | "observer.emergencyPowerState"
  | "observer.angleNetworkState"
  | "mythos.houndStage"
  | "mythos.blueIchorContact"
  | "mythos.fullManifestationOccurred"
  | "kuramochi.state"
  | "kuramochi.firstInformationSource"
  | "kuramochi.fixedVariant"
  | "kuramochi.multipleFixation";

export type CollectionStatePath =
  | "story.clues"
  | "story.inventory"
  | "story.flags"
  | "mythos.markedCharacters"
  | "kuramochi.variants.A.clues"
  | "kuramochi.variants.B.clues"
  | "kuramochi.variants.C.clues";

export type StateEffect =
  | { op: "inc"; path: NumericStatePath; value: number }
  | { op: "set"; path: ScalarStatePath; value: unknown }
  | { op: "add"; path: CollectionStatePath; value: string }
  | { op: "remove"; path: CollectionStatePath; value: string }
  | { op: "revealKuramochi"; variant: KuramochiVariantId }
  | { op: "contactKuramochi"; variant: KuramochiVariantId }
  | { op: "fixKuramochi"; variant: KuramochiVariantId }
  | { op: "enableMultipleFixation" }
  | { op: "selectKuramochiInfo"; strategy: "random" | "strongest" | "probe" | "companion" };


export interface FollowUpOption {
  id: string;
  label: string;
  effects: StateEffect[];
}

export interface UnscoredFollowUp {
  id: string;
  prompt: string;
  options: FollowUpOption[];
}

export interface ChoiceDefinition {
  id: string;
  label: string;
  detail?: string;
  outcome: string;
  diagnosticWeights: DiagnosticWeights;
  effects: StateEffect[];
  conditions?: Condition[];
  salience?: number;
  usesDice?: boolean;
  diceThreshold?: number;
  diceEffects?: {
    success: StateEffect[];
    failure: StateEffect[];
  };
  followUp?: UnscoredFollowUp;
}

export interface ChoiceTextOverride {
  label?: string;
  detail?: string;
  outcome?: string;
}

export interface SceneVariantDefinition {
  id: string;
  conditions: Condition[];
  priority?: number;
  bodyPrefix?: string;
  body?: string;
  bodySuffix?: string;
  choiceOverrides?: Record<string, ChoiceTextOverride>;
}

export interface SceneDefinition {
  slotId: MeasurementSlotId;
  act: ActNumber;
  title: string;
  primaryAxes: [DiagnosticAxis, DiagnosticAxis];
  ui: "cards" | "dialogue" | "map" | "allocation" | "risk" | "dice" | "quadrant" | "evidence" | "order";
  body: string;
  constraint?: string;
  choices: ChoiceDefinition[];
  variants: SceneVariantDefinition[];
  recordUnchosenAct?: 1 | 2 | 3 | 4;
}

export interface ResolvedScene extends Omit<SceneDefinition, "variants"> {
  sceneVariantId: string;
}

export interface KuramochiInformationCard {
  id: KuramochiVariantId;
  title: string;
  summary: string;
  continuityEvidence: string[];
  strengths: string[];
  risks: string[];
  firstContactClue: string;
}

export type EndingId =
  | "ENDING_A_ANGLELESS_MORNING"
  | "ENDING_B_DIFFERENT_YESTERDAY"
  | "ENDING_C_EGGSHELL_PRISON"
  | "ENDING_D_PURSUIT_CONTINUES"
  | "ENDING_E_NOT_ONE_BUILDING"
  | "ENDING_F_MULTIPLE_UNCHOSEN"
  | "ENDING_G_TOMORROWS_RECORDING";

export interface EndingDefinition {
  id: EndingId;
  title: string;
  summary: string;
}

export interface ValidationIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  slotId?: AnySlotId;
  choiceId?: string;
}

export interface ExplorationReport {
  abstractStatesVisited: number;
  terminalAbstractStates: number;
  representedConcretePathCount: string;
  reachedSlots: AnySlotId[];
  reachedSceneVariants: string[];
  exercisedChoiceIds: string[];
  endings: Record<EndingId, string>;
  deadEnds: string[];
  invariantViolations: string[];
}

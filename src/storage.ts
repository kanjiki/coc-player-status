import type { AppState } from "./core/types.js";

const STORAGE_KEY = "coc-status-diagnosis:session:v1";
const SURVEY_KEY = "coc-status-diagnosis:survey:v1";
const SENT_KEY_PREFIX = "coc-status-diagnosis:sent:";

export type AppPhase = "scene" | "outcome" | "result";

export interface PendingOutcome {
  slotId: string;
  sceneTitle: string;
  choiceId: string;
  choiceLabel: string;
  outcome: string;
  followUpLabel?: string;
  diceRoll?: number;
  diceSuccess?: boolean;
}

export interface OptionalSurvey {
  cocExperience: string;
  plExperience: string;
  kpExperience: string;
  scenarioCreationExperience: string;
  savedAt: string;
}

export interface PersistedSession {
  schemaVersion: 1;
  appVersion: string;
  phase: AppPhase;
  state: AppState;
  snapshots: AppState[];
  pendingOutcome: PendingOutcome | null;
  completedAt: string | null;
  updatedAt: string;
}

export function saveSession(session: PersistedSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn("診断状態を保存できませんでした", error);
  }
}

export function loadSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedSession>;
    if (parsed.schemaVersion !== 1 || !parsed.state || !parsed.phase || !Array.isArray(parsed.snapshots)) {
      return null;
    }
    return parsed as PersistedSession;
  } catch (error) {
    console.warn("保存済み診断を読み込めませんでした", error);
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function saveSurvey(survey: OptionalSurvey): void {
  localStorage.setItem(SURVEY_KEY, JSON.stringify(survey));
}

export function loadSurvey(): OptionalSurvey | null {
  try {
    const raw = localStorage.getItem(SURVEY_KEY);
    return raw ? (JSON.parse(raw) as OptionalSurvey) : null;
  } catch {
    return null;
  }
}

export function clearSurvey(): void {
  localStorage.removeItem(SURVEY_KEY);
}

export function markSessionSent(sessionSeed: string): void {
  localStorage.setItem(`${SENT_KEY_PREFIX}${sessionSeed}`, new Date().toISOString());
}

export function wasSessionSent(sessionSeed: string): boolean {
  return localStorage.getItem(`${SENT_KEY_PREFIX}${sessionSeed}`) !== null;
}

export function clearAllLocalData(): void {
  clearSession();
  clearSurvey();
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(SENT_KEY_PREFIX)) localStorage.removeItem(key);
  }
}

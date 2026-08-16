import type { AbilityResult } from "./ability.js";
import type { AppConfig } from "./config.js";
import type { EndingDefinition, AppState } from "./core/types.js";
import type { OptionalSurvey } from "./storage.js";

export interface DiagnosticPayload {
  event: "diagnosis_completed" | "optional_survey" | "session_started" | "scene_answered" | "result_viewed";
  schemaVersion: 1;
  appVersion: string;
  coreVersion: "0.6.0";
  recordedAt: string;
  sessionId: string;
  startedAt?: string;
  completedAt?: string;
  durationSec?: number;
  sceneIndex?: number;
  slotId?: string;
  elapsedSec?: number;
  deviceClass?: string;
  history?: AppState["history"];
  finalState?: {
    story: AppState["story"];
    observer: AppState["observer"];
    mythos: AppState["mythos"];
    kuramochi: AppState["kuramochi"];
    diagnostic: AppState["diagnostic"];
  };
  ending?: EndingDefinition;
  abilities?: Array<{
    id: string;
    value: number;
    percentile: number;
    theta: number;
  }>;
  survey?: OptionalSurvey;
}

async function postPayload(config: AppConfig, payload: DiagnosticPayload): Promise<boolean> {
  if (!config.collectDiagnostics || !config.dataEndpoint.trim()) return false;
  try {
    const response = await fetch(config.dataEndpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      keepalive: true,
      mode: "cors"
    });
    return response.ok || response.type === "opaque";
  } catch (error) {
    console.warn("診断ログを送信できませんでした", error);
    return false;
  }
}

export function sendCompletedDiagnosis(
  config: AppConfig,
  state: AppState,
  ending: EndingDefinition,
  abilities: readonly AbilityResult[],
  timing?: { startedAt?: string; completedAt?: string | null }
): Promise<boolean> {
  const completedAt = timing?.completedAt ?? new Date().toISOString();
  const startedMs = timing?.startedAt ? Date.parse(timing.startedAt) : NaN;
  const completedMs = Date.parse(completedAt);
  const durationSec = Number.isFinite(startedMs) && Number.isFinite(completedMs)
    ? Math.max(0, Math.round((completedMs - startedMs) / 1000))
    : undefined;
  return postPayload(config, {
    event: "diagnosis_completed",
    schemaVersion: 1,
    appVersion: config.version,
    coreVersion: "0.6.0",
    recordedAt: new Date().toISOString(),
    sessionId: state.sessionSeed,
    ...(timing?.startedAt ? { startedAt: timing.startedAt } : {}),
    completedAt,
    ...(durationSec !== undefined ? { durationSec } : {}),
    history: state.history,
    finalState: {
      story: state.story,
      observer: state.observer,
      mythos: state.mythos,
      kuramochi: state.kuramochi,
      diagnostic: state.diagnostic
    },
    ending,
    abilities: abilities.map((ability) => ({
      id: ability.id,
      value: ability.value,
      percentile: ability.percentile,
      theta: ability.theta
    }))
  });
}

export function sendOptionalSurvey(
  config: AppConfig,
  sessionId: string,
  survey: OptionalSurvey
): Promise<boolean> {
  return postPayload(config, {
    event: "optional_survey",
    schemaVersion: 1,
    appVersion: config.version,
    coreVersion: "0.6.0",
    recordedAt: new Date().toISOString(),
    sessionId,
    survey
  });
}


export function sendFunnelEvent(
  config: AppConfig,
  sessionId: string,
  data: { event: string; sceneIndex?: number; slotId?: string; elapsedSec?: number; deviceClass?: string }
): Promise<boolean> {
  return postPayload(config, {
    event: data.event as DiagnosticPayload["event"],
    schemaVersion: 1,
    appVersion: config.version,
    coreVersion: "0.6.0",
    recordedAt: new Date().toISOString(),
    sessionId,
    ...(data.sceneIndex !== undefined ? { sceneIndex: data.sceneIndex } : {}),
    ...(data.slotId ? { slotId: data.slotId } : {}),
    ...(data.elapsedSec !== undefined ? { elapsedSec: data.elapsedSec } : {}),
    ...(data.deviceClass ? { deviceClass: data.deviceClass } : {})
  });
}

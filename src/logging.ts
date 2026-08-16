import type { AbilityResult } from "./ability.js";
import type { AppConfig } from "./config.js";
import type { EndingDefinition, AppState } from "./core/types.js";
import type { OptionalSurvey } from "./storage.js";

export interface DiagnosticPayload {
  event: "diagnosis_completed" | "optional_survey";
  schemaVersion: 1;
  appVersion: string;
  coreVersion: "0.5.0";
  recordedAt: string;
  sessionId: string;
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
  abilities: readonly AbilityResult[]
): Promise<boolean> {
  return postPayload(config, {
    event: "diagnosis_completed",
    schemaVersion: 1,
    appVersion: config.version,
    coreVersion: "0.5.0",
    recordedAt: new Date().toISOString(),
    sessionId: state.sessionSeed,
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
    coreVersion: "0.5.0",
    recordedAt: new Date().toISOString(),
    sessionId,
    survey
  });
}

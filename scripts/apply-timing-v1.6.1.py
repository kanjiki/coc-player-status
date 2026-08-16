from pathlib import Path

# types.ts: keep scene duration in the final history payload.
p = Path('src/core/types.ts')
s = p.read_text(encoding='utf-8')
old = '''export interface HistoryEntry {
  slotId: AnySlotId;
  sceneVariantId: string;
  visibleChoiceIds: string[];
  selectedChoiceId: string;
  diceRoll?: number;
  snapshotHash: string;
  response?: ResponseMetadata;
}'''
new = '''export interface HistoryEntry {
  slotId: AnySlotId;
  sceneVariantId: string;
  visibleChoiceIds: string[];
  selectedChoiceId: string;
  diceRoll?: number;
  snapshotHash: string;
  response?: ResponseMetadata;
  durationMs?: number;
}'''
if old not in s: raise SystemExit('HistoryEntry marker not found')
p.write_text(s.replace(old,new,1), encoding='utf-8')

# storage.ts: persist diagnosis start time and migrate old local sessions safely.
p = Path('src/storage.ts')
s = p.read_text(encoding='utf-8')
old = '''  pendingOutcome: PendingOutcome | null;
  completedAt: string | null;
  updatedAt: string;
}'''
new = '''  pendingOutcome: PendingOutcome | null;
  startedAt: string;
  completedAt: string | null;
  updatedAt: string;
}'''
if old not in s: raise SystemExit('PersistedSession marker not found')
s = s.replace(old,new,1)
old = '''    if (parsed.schemaVersion !== 1 || !parsed.state || !parsed.phase || !Array.isArray(parsed.snapshots)) {
      return null;
    }
    return parsed as PersistedSession;'''
new = '''    if (parsed.schemaVersion !== 1 || !parsed.state || !parsed.phase || !Array.isArray(parsed.snapshots)) {
      return null;
    }
    if (!parsed.startedAt) parsed.startedAt = parsed.updatedAt ?? new Date().toISOString();
    return parsed as PersistedSession;'''
if old not in s: raise SystemExit('loadSession migration marker not found')
p.write_text(s.replace(old,new,1), encoding='utf-8')

# logging.ts: timing fields plus lightweight funnel events.
p = Path('src/logging.ts')
s = p.read_text(encoding='utf-8')
s = s.replace('''  recordedAt: string;
  sessionId: string;''','''  recordedAt: string;
  sessionId: string;
  startedAt?: string;
  completedAt?: string;
  durationSec?: number;
  sceneIndex?: number;
  slotId?: string;
  elapsedSec?: number;
  deviceClass?: string;''',1)
old = '''export function sendCompletedDiagnosis(
  config: AppConfig,
  state: AppState,
  ending: EndingDefinition,
  abilities: readonly AbilityResult[]
): Promise<boolean> {
  return postPayload(config, {
    event: "diagnosis_completed",
    schemaVersion: 1,
    appVersion: config.version,
    coreVersion: "0.6.0",
    recordedAt: new Date().toISOString(),
    sessionId: state.sessionSeed,'''
new = '''export function sendCompletedDiagnosis(
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
    ...(durationSec !== undefined ? { durationSec } : {}),'''
if old not in s: raise SystemExit('sendCompletedDiagnosis marker not found')
s = s.replace(old,new,1)
append = '''

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
'''
# Widen event union so funnel events typecheck.
s = s.replace('event: "diagnosis_completed" | "optional_survey";', 'event: "diagnosis_completed" | "optional_survey" | "session_started" | "scene_answered" | "result_viewed";',1)
s += append
p.write_text(s, encoding='utf-8')

# app.ts: active scene timer + total timing + funnel events.
p = Path('src/app.ts')
s = p.read_text(encoding='utf-8')
s = s.replace('import { sendCompletedDiagnosis, sendOptionalSurvey } from "./logging.js";', 'import { sendCompletedDiagnosis, sendFunnelEvent, sendOptionalSurvey } from "./logging.js";',1)
s = s.replace('''let pageMode: "landing" | "session" = "landing";
let toastCounter = 0;''','''let pageMode: "landing" | "session" = "landing";
let toastCounter = 0;
let sceneActiveAccumulatedMs = 0;
let sceneActiveStartedAt: number | null = null;

function beginSceneTiming(): void {
  sceneActiveAccumulatedMs = 0;
  sceneActiveStartedAt = document.visibilityState === "visible" ? Date.now() : null;
}

function pauseSceneTiming(): void {
  if (sceneActiveStartedAt !== null) {
    sceneActiveAccumulatedMs += Math.max(0, Date.now() - sceneActiveStartedAt);
    sceneActiveStartedAt = null;
  }
}

function resumeSceneTiming(): void {
  if (pageMode === "session" && session?.phase === "scene" && sceneActiveStartedAt === null) {
    sceneActiveStartedAt = Date.now();
  }
}

function currentSceneDurationMs(): number {
  return sceneActiveAccumulatedMs + (sceneActiveStartedAt === null ? 0 : Math.max(0, Date.now() - sceneActiveStartedAt));
}

function sessionElapsedSec(): number {
  if (!session?.startedAt) return 0;
  const started = Date.parse(session.startedAt);
  return Number.isFinite(started) ? Math.max(0, Math.round((Date.now() - started) / 1000)) : 0;
}

function deviceClass(): string {
  const ua = navigator.userAgent;
  if (/Mobi|Android|iPhone|iPad/i.test(ua)) return "mobile";
  return "desktop";
}''',1)
old = '''    snapshots: [],
    pendingOutcome: null,
    completedAt: null,
    updatedAt: currentDateTime()'''
new = '''    snapshots: [],
    pendingOutcome: null,
    startedAt: currentDateTime(),
    completedAt: null,
    updatedAt: currentDateTime()'''
if old not in s: raise SystemExit('buildSession marker not found')
s = s.replace(old,new,1)
s = s.replace('''function renderScene(): void {
  if (!session) return renderLanding();
  const scene = resolveScene(session.state);''','''function renderScene(): void {
  if (!session) return renderLanding();
  beginSceneTiming();
  const scene = resolveScene(session.state);''',1)
s = s.replace('''function startNew(): void {
  session = buildSession();
  pageMode = "session";
  persist();
  renderScene();''','''function startNew(): void {
  session = buildSession();
  pageMode = "session";
  persist();
  void sendFunnelEvent(APP_CONFIG, session.state.sessionSeed, {
    event: "session_started",
    sceneIndex: 1,
    slotId: String(session.state.story.currentSlot),
    elapsedSec: 0,
    deviceClass: deviceClass()
  });
  renderScene();''',1)
s = s.replace('''function goHome(): void {
  pageMode = "landing";''','''function goHome(): void {
  pauseSceneTiming();
  pageMode = "landing";''',1)
old = '''function commitChoice(choiceId: string, followUpOptionId?: string, responseMetadata: ResponseMetadata = { kind: "choice" }, responseSummary?: string): void {
  if (!session) return;
  const snapshot = cloneState(session.state);
  const result = applyChoice(session.state, choiceId, followUpOptionId, undefined, responseMetadata);'''
new = '''function commitChoice(choiceId: string, followUpOptionId?: string, responseMetadata: ResponseMetadata = { kind: "choice" }, responseSummary?: string): void {
  if (!session) return;
  const sceneDurationMs = Math.round(currentSceneDurationMs());
  pauseSceneTiming();
  const snapshot = cloneState(session.state);
  const result = applyChoice(session.state, choiceId, followUpOptionId, undefined, responseMetadata);'''
if old not in s: raise SystemExit('commitChoice start marker not found')
s = s.replace(old,new,1)
old = '''  session.snapshots.push(snapshot);
  session.state = result.state;
  const pending: PendingOutcome = {'''
new = '''  session.snapshots.push(snapshot);
  session.state = result.state;
  const historyEntry = session.state.history.at(-1);
  if (historyEntry) historyEntry.durationMs = sceneDurationMs;
  void sendFunnelEvent(APP_CONFIG, session.state.sessionSeed, {
    event: "scene_answered",
    sceneIndex: session.state.history.length,
    slotId: result.scene.slotId,
    elapsedSec: sessionElapsedSec(),
    deviceClass: deviceClass()
  });
  const pending: PendingOutcome = {'''
if old not in s: raise SystemExit('commitChoice state marker not found')
s = s.replace(old,new,1)
s = s.replace('''    session.completedAt ??= currentDateTime();
    persist();
    renderResult();''','''    session.completedAt ??= currentDateTime();
    persist();
    void sendFunnelEvent(APP_CONFIG, session.state.sessionSeed, {
      event: "result_viewed",
      sceneIndex: session.state.history.length,
      slotId: "S02",
      elapsedSec: sessionElapsedSec(),
      deviceClass: deviceClass()
    });
    renderResult();''',1)
s = s.replace('''  const sent = await sendCompletedDiagnosis(APP_CONFIG, session.state, ending, abilities);''','''  const sent = await sendCompletedDiagnosis(APP_CONFIG, session.state, ending, abilities, {
    startedAt: session.startedAt,
    completedAt: session.completedAt
  });''',1)
# pause/resume timing when tab visibility changes.
s += '''

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") pauseSceneTiming();
  else resumeSceneTiming();
});
'''
p.write_text(s, encoding='utf-8')

# GAS reference implementation: consume timing fields and fix LUCK id.
p = Path('backend/Code.gs')
s = p.read_text(encoding='utf-8')
s = s.replace("    '',\n    payload.recordedAt || '',\n    '',", "    payload.startedAt || '',\n    payload.completedAt || payload.recordedAt || '',\n    payload.durationSec ?? '',",1)
s = s.replace("valueOfAbility_(abilities, 'Luck')", "valueOfAbility_(abilities, 'LUCK')",1)
s = s.replace("      '',\n      '',\n      '',\n      ''\n    ]);", "      entry.durationMs ?? '',\n      '',\n      '',\n      ''\n    ]);",1)
p.write_text(s, encoding='utf-8')

# version bump.
for name in ('package.json','public/site-config.js'):
    p=Path(name); s=p.read_text(encoding='utf-8')
    if '1.6.0-beta.1' not in s: raise SystemExit(f'version marker missing {name}')
    p.write_text(s.replace('1.6.0-beta.1','1.6.1-beta.1'),encoding='utf-8')

# Regression test.
Path('tests/timing-analytics.test.mjs').write_text('''import test from "node:test";\nimport assert from "node:assert/strict";\nimport fs from "node:fs";\n\nconst app = fs.readFileSync("src/app.ts", "utf8");\nconst storage = fs.readFileSync("src/storage.ts", "utf8");\nconst logging = fs.readFileSync("src/logging.ts", "utf8");\nconst types = fs.readFileSync("src/core/types.ts", "utf8");\nconst gas = fs.readFileSync("backend/Code.gs", "utf8");\n\ntest("diagnosis and scene timing are persisted and sent", () => {\n  assert.match(storage, /startedAt: string/);\n  assert.match(types, /durationMs\\?: number/);\n  assert.match(app, /historyEntry\\.durationMs = sceneDurationMs/);\n  assert.match(logging, /durationSec/);\n  assert.match(app, /scene_answered/);\n  assert.match(app, /session_started/);\n});\n\ntest("GAS consumes timing fields and uppercase LUCK", () => {\n  assert.match(gas, /payload\\.startedAt/);\n  assert.match(gas, /payload\\.durationSec/);\n  assert.match(gas, /entry\\.durationMs/);\n  assert.match(gas, /valueOfAbility_\\(abilities, 'LUCK'\\)/);\n});\n''', encoding='utf-8')
print('timing analytics patch applied')

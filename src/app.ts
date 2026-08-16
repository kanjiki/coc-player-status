import { APP_CONFIG, isRemoteCollectionEnabled } from "./config.js";
import {
  buildProfileSummary,
  buildProfileTitle,
  getAbilityResults,
  getDistinctiveAbilities,
  type AbilityResult
} from "./ability.js";
import { KURAMOCHI_CARDS } from "./core/cards.js";
import { MEASUREMENT_ORDER } from "./core/constants.js";
import { determineEnding } from "./core/endings.js";
import {
  applyChoice,
  cloneState,
  fixationClueCount,
  networkClueCount,
  resolveScene,
  sealClueCount,
  stopClueCount
} from "./core/engine.js";
import { createInitialState } from "./core/initialState.js";
import {
  RESPONSE_CONFIGS,
  type AllocationResponseConfig,
  type QuadrantResponseConfig,
  type RankingResponseConfig,
  type SliderResponseConfig,
  type StructuredResponseConfig
} from "./core/responseConfigs.js";
import { SCENE_GUIDES } from "./core/sceneGuides.js";
import { READ_ALOUD_TEXT } from "./core/readAloud.js";
import { SCENE_BY_SLOT } from "./core/scenes.js";
import type { AppState, ChoiceDefinition, DiagnosticWeights, EndingDefinition, ResolvedScene, ResponseMetadata } from "./core/types.js";
import { sendCompletedDiagnosis, sendOptionalSurvey } from "./logging.js";
import {
  clearAllLocalData,
  clearSession,
  loadSession,
  loadSurvey,
  markSessionSent,
  saveSession,
  saveSurvey,
  wasSessionSent,
  type OptionalSurvey,
  type PendingOutcome,
  type PersistedSession
} from "./storage.js";
import { createResultCardBlob, downloadBlob, drawRadarChart } from "./visuals.js";

const appElement = document.querySelector<HTMLDivElement>("#app");
if (!appElement) throw new Error("#app not found");
const app: HTMLDivElement = appElement;

const debugMode = new URLSearchParams(location.search).get("debug") === "1";
let session: PersistedSession | null = loadSession();
let pageMode: "landing" | "session" = "landing";
let toastCounter = 0;

const UI_LABELS: Record<ResolvedScene["ui"], string> = {
  cards: "行動選択",
  dialogue: "対話",
  map: "経路選択",
  allocation: "資源配分",
  risk: "リスク判断",
  dice: "判定選択",
  quadrant: "価値判断",
  evidence: "証拠整理",
  order: "優先順位"
};

const LOCATION_LABELS: Record<string, string> = {
  management_office: "管理会社",
  rounded_service_hatch: "円形ハッチ",
  front_corridor: "雨声荘・正面廊下",
  sealed_entrance: "封鎖入口",
  exterior: "雨声荘外周",
  management_room: "管理室",
  hidden_space: "図面にない空間",
  first_floor: "雨声荘一階",
  basement: "地下区画",
  old_laundry: "旧洗濯室",
  echo_corridor: "時間残響区画",
  observation_antechamber: "観測室前",
  observer_room: "時角観測室",
  eggshell_shelter: "卵殻型避難室",
  curved_exit: "曲面退避経路"
};

const COMPANION_LABELS: Record<AppState["story"]["companion"], string> = {
  none: "単独",
  sakaki_remote: "榊（通信）",
  sumie_remote: "澄江（通信）",
  sumie_present: "澄江（同行）"
};

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function randomSeed(): string {
  const bytes = new Uint32Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(8, "0")).join("");
}

function currentDateTime(): string {
  return new Date().toISOString();
}

function buildSession(): PersistedSession {
  return {
    schemaVersion: 1,
    appVersion: APP_CONFIG.version,
    phase: "scene",
    state: createInitialState(randomSeed()),
    snapshots: [],
    pendingOutcome: null,
    completedAt: null,
    updatedAt: currentDateTime()
  };
}

function persist(): void {
  if (!session) return;
  session.updatedAt = currentDateTime();
  saveSession(session);
}

function pageHeader(active: boolean): string {
  return `
    <header class="site-header">
      <div class="header-inner">
        <button class="brand-button" type="button" data-action="home" aria-label="トップへ戻る">
          <span class="brand-mark" aria-hidden="true"></span>
          <span class="brand-text">
            <strong>${escapeHtml(APP_CONFIG.appName)}</strong>
            <small>${escapeHtml(APP_CONFIG.scenarioTitle)}</small>
          </span>
        </button>
        <div class="header-actions">
          ${active ? `<button class="text-button" type="button" data-action="restart">初めから</button>` : ""}
          <a class="text-button" href="./data-policy.html">データ</a>
        </div>
      </div>
    </header>`;
}

function pageFooter(): string {
  return `
    <footer class="site-footer">
      <div class="footer-inner">
        <p>非公式ファンメイド診断｜Core v0.6.0｜UI v${escapeHtml(APP_CONFIG.version)}</p>
        <p class="rights-notice">${escapeHtml(APP_CONFIG.rightsNotice)}</p>
      </div>
    </footer>`;
}

function renderLanding(): void {
  document.title = `${APP_CONFIG.appName}｜${APP_CONFIG.scenarioTitle}`;
  const saved = session;
  const remote = isRemoteCollectionEnabled();
  const savedLabel = saved?.phase === "result"
    ? "保存された結果を表示"
    : `続きから再開（${saved?.state.history.length ?? 0} / ${MEASUREMENT_ORDER.length} Scene）`;

  app.innerHTML = `
    <div class="landing-page">
      ${pageHeader(false)}
      <main id="main-content">
        <section class="hero">
          <div class="hero-copy">
            <p class="eyebrow">PLAY-BEHAVIOR DIAGNOSIS</p>
            <h1>${escapeHtml(APP_CONFIG.scenarioTitle)}</h1>
            <p class="hero-lead">性格ではなく、怪異の前で何を選ぶか。短編CoC風シナリオを進め、あなたの選択履歴から6版風ステータスを算出します。</p>
            <div class="data-notice incident-brief">
              <strong>事件の始まり</strong>
              <p>翌朝に解体を控えた旧共同住宅「雨声荘」で、建物調査員の倉持直人が内部調査中に消息を絶ちました。</p>
              <p>失踪直前、管理会社担当の榊亜希へ倉持から音声ファイルが届きます。倉持本人の声に、同じ声で「右へ行った俺を助けるな。左から来る俺も、俺だと思っている」という言葉が重なり、ファイルの作成時刻は送信時刻より17分後を示していました。</p>
              <p>あなたは榊から、雨声荘の安全確認、倉持の安否確認、調査資料の回収を依頼された調査協力者です。現地へ向かおうとした直前、その音声が一時サーバーの自動処理でまもなく消えると判明します。</p>
              <p><strong>Scene 1では、現地へ向かう前に何を最初に確保するかを決めます。</strong></p>
            </div>
            <blockquote class="hero-quote">「右へ行った俺を助けるな。左から来る俺も、俺だと思っている」</blockquote>
            <div class="hero-actions">
              <button class="primary-button" type="button" data-action="start">新しく診断を始める</button>
              ${saved ? `<button class="secondary-button" type="button" data-action="resume">${escapeHtml(savedLabel)}</button>` : ""}
            </div>
            ${saved ? `<p class="hero-meta">前回の状態はこのブラウザ内に保存されています。<button class="text-button" type="button" data-action="clear">保存データを削除</button></p>` : ""}
          </div>
          <div class="observer-visual" aria-hidden="true">
            <span class="observer-ring"></span>
            <span class="observer-angle"></span>
            <span class="observer-label">17 MINUTES AHEAD</span>
          </div>
        </section>

        <section class="landing-section" aria-label="診断について">
          <div class="info-grid">
            <article class="info-card">
              <h2>状況整理付き24 Scene</h2>
              <p>各場面で、目的・確定情報・代償を先に整理します。行動選択を基本に、連続量を測る場面だけスライダー、同時対応の場面では優先順位を使います。</p>
            </article>
            <article class="info-card">
              <h2>分岐する状況</h2>
              <p>選んだ行動に応じて、同行者、手掛かり、倉持の時間状態、猟犬の接近が変化します。</p>
            </article>
            <article class="info-card">
              <h2>6版風ステータス</h2>
              <p>STR～EDU、SAN、幸運を表示します。数値は優劣ではなく、プレイ中の判断傾向です。</p>
            </article>
          </div>
          <div class="data-notice">
            <strong>回答データについて：</strong>
            ${remote
              ? "選択履歴と結果は、設問改善・能力値換算・不具合確認のため、設定済みの保存先へ送信されます。氏名・メールアドレス・SNSアカウントは取得しません。"
              : "この初期設定では、選択履歴と結果は中断・再開のためブラウザ内だけに保存され、外部へ送信されません。"}
            <a href="./data-policy.html">詳細</a>
          </div>
        </section>
      </main>
      ${pageFooter()}
    </div>
    <div class="toast-region" aria-live="assertive" aria-atomic="true"></div>`;
}

function getAtmosphere(state: AppState): { label: string; active: number } {
  if (state.mythos.houndStage >= 3) return { label: "角の向こうから見られている", active: 3 };
  if (state.mythos.houndStage >= 2) return { label: "追跡の気配が離れない", active: 2 };
  if (state.mythos.houndPressure >= 3) return { label: "青黒い煙が濃くなる", active: 2 };
  return { label: "角で時計が止まっている", active: 1 };
}

function remainingTimeLabel(state: AppState): string {
  if (state.story.timeUnits > 0) return `猶予 ${state.story.timeUnits}`;
  if (state.story.timeUnits === 0) return "午前3時17分";
  return `期限超過 ${Math.abs(state.story.timeUnits)}`;
}

function investigationPanel(state: AppState): string {
  const atmosphere = getAtmosphere(state);
  return `
    <aside class="investigation-panel" aria-label="調査状況">
      <h2>調査記録</h2>
      <dl class="case-list">
        <div class="case-row"><dt>現在地</dt><dd>${escapeHtml(LOCATION_LABELS[state.story.location] ?? state.story.location)}</dd></div>
        <div class="case-row"><dt>同行</dt><dd>${escapeHtml(COMPANION_LABELS[state.story.companion])}</dd></div>
        <div class="case-row"><dt>手掛かり</dt><dd>${state.story.clues.length}件</dd></div>
        <div class="case-row"><dt>時刻</dt><dd>${escapeHtml(remainingTimeLabel(state))}</dd></div>
      </dl>
      <div class="atmosphere-meter">
        <span class="state-badge">異常兆候</span>
        <p>${escapeHtml(atmosphere.label)}</p>
        <div class="atmosphere-track" aria-label="怪異の接近度">
          ${[1, 2, 3].map((level) => `<span class="${level <= atmosphere.active ? "active" : ""}"></span>`).join("")}
        </div>
      </div>
      ${debugMode ? `<pre class="debug-panel">${escapeHtml(JSON.stringify({ story: state.story, observer: state.observer, mythos: state.mythos, kuramochi: state.kuramochi }, null, 2))}</pre>` : ""}
    </aside>`;
}

function progressPanel(state: AppState): string {
  const completed = state.history.length;
  const current = Math.min(MEASUREMENT_ORDER.length, completed + 1);
  const percentage = Math.min(100, (completed / MEASUREMENT_ORDER.length) * 100);
  return `
    <section class="progress-panel" aria-label="診断進行状況">
      <div class="progress-copy">
        <strong>ACT ${state.story.act}｜SCENE ${current}</strong>
        <span>${completed} / ${MEASUREMENT_ORDER.length} 完了</span>
      </div>
      <div class="progress-track" aria-hidden="true"><div class="progress-bar" style="--progress:${percentage}%"></div></div>
      <div class="save-indicator">端末内に自動保存</div>
    </section>`;
}

function choiceLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

function choiceCardMarkup(choice: ChoiceDefinition, index: number): string {
  return `
    <button class="choice-card" type="button" data-choice-id="${escapeHtml(choice.id)}">
      <span class="choice-key">${choiceLetter(index)}</span>
      <span class="choice-copy">
        <strong>${escapeHtml(choice.label)}</strong>
        ${choice.detail ? `<small>${escapeHtml(choice.detail)}</small>` : ""}
      </span>
      <span class="choice-arrow" aria-hidden="true">›</span>
      ${choice.usesDice ? `<span class="dice-badge">1D100</span>` : ""}
    </button>`;
}

function readAloudMarkup(scene: ResolvedScene): string {
  const text = READ_ALOUD_TEXT[scene.slotId] ?? scene.body;
  const paragraphs = text.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
  return `<div class="read-aloud-copy">${paragraphs.map((paragraph) => `<p class="scene-body">${escapeHtml(paragraph)}</p>`).join("")}</div>`;
}

function sceneGuideMarkup(scene: ResolvedScene): string {
  const guide = SCENE_GUIDES[scene.slotId];
  return `
    <section class="scene-guide" aria-label="確認できること">
      <div class="scene-guide-grid">
        <div>
          <h2>確認できること</h2>
          <ul>${guide.knownFacts.map((fact) => `<li>${escapeHtml(fact)}</li>`).join("")}</ul>
        </div>
      </div>
      ${guide.glossary?.length ? `
        <details class="scene-glossary">
          <summary>用語の補足</summary>
          ${guide.glossary.map((item) => `<p><strong>${escapeHtml(item.term)}</strong>：${escapeHtml(item.definition)}</p>`).join("")}
        </details>` : ""}
    </section>`;
}

function hashNumber(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function deterministicOrder<T extends { id: string }>(items: readonly T[], seed: string): T[] {
  return [...items].sort((left, right) => hashNumber(`${seed}:${left.id}`) - hashNumber(`${seed}:${right.id}`));
}

function sliderBand(config: SliderResponseConfig, value: number) {
  return config.bands.find((band) => value <= band.max) ?? config.bands.at(-1)!;
}

function renderSliderResponse(scene: ResolvedScene, config: SliderResponseConfig): string {
  const initialBand = sliderBand(config, config.defaultValue);
  return `
    <section class="response-workbench slider-workbench" data-response-kind="slider">
      <div class="response-heading">
        <h2>連続した判断で回答</h2>
        <p>${escapeHtml(config.prompt)}</p>
      </div>
      <div class="slider-endpoints">
        <div><strong>${escapeHtml(config.minLabel)}</strong><small>${escapeHtml(config.minHint)}</small></div>
        <div><strong>${escapeHtml(config.maxLabel)}</strong><small>${escapeHtml(config.maxHint)}</small></div>
      </div>
      <input class="decision-slider" type="range" min="0" max="100" step="1" value="${config.defaultValue}" data-slider-control data-touched="false" aria-label="${escapeHtml(config.prompt)}">
      <div class="slider-scale" aria-hidden="true"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
      <div class="response-preview" data-response-preview>
        <span class="response-value" data-response-value>${config.defaultValue}</span>
        <div><strong>${escapeHtml(initialBand.label)}</strong><p>${escapeHtml(initialBand.explanation)}</p></div>
      </div>
      <p class="response-note">中央は初期位置です。スライダーを一度動かすと決定できます。</p>
      <button class="primary-button structured-submit" type="button" data-action="submit-slider" disabled>この位置で決定する</button>
    </section>`;
}

function quadrantKey(x: number, y: number): "lowLow" | "highLow" | "lowHigh" | "highHigh" {
  const xHigh = x >= 50;
  const yHigh = y >= 50;
  if (xHigh && yHigh) return "highHigh";
  if (xHigh) return "highLow";
  if (yHigh) return "lowHigh";
  return "lowLow";
}

function normalizeResponseValue(value: number): number {
  return Math.max(-1, Math.min(1, (value - 50) / 50));
}

function mergeWeightedEvidence(
  target: DiagnosticWeights,
  weights: DiagnosticWeights,
  multiplier: number
): void {
  for (const [axis, weight] of Object.entries(weights)) {
    const typedAxis = axis as keyof DiagnosticWeights;
    target[typedAxis] = (target[typedAxis] ?? 0) + weight * multiplier;
  }
}

function allocationAxisEvidence(
  scene: ResolvedScene,
  config: AllocationResponseConfig,
  values: Record<string, number>
): DiagnosticWeights {
  const evidence: DiagnosticWeights = {};
  for (const item of config.items) {
    const count = values[item.id] ?? 0;
    if (count <= 0) continue;
    const sourceChoice = scene.choices.find((choice) => choice.id === item.dominantChoiceId);
    if (!sourceChoice) continue;
    mergeWeightedEvidence(evidence, sourceChoice.diagnosticWeights, count / config.budget);
  }
  return evidence;
}

function rankingAxisEvidence(scene: ResolvedScene, order: readonly string[]): DiagnosticWeights {
  const rankWeights = [1, 0.6, 0.3, 0] as const;
  const denominator = rankWeights.slice(0, order.length).reduce<number>((sum, value) => sum + value, 0) || 1;
  const evidence: DiagnosticWeights = {};
  order.forEach((choiceId, index) => {
    const sourceChoice = scene.choices.find((choice) => choice.id === choiceId);
    if (!sourceChoice) return;
    mergeWeightedEvidence(evidence, sourceChoice.diagnosticWeights, (rankWeights[index] ?? 0) / denominator);
  });
  return evidence;
}

function renderQuadrantResponse(scene: ResolvedScene, config: QuadrantResponseConfig): string {
  const initialKey = quadrantKey(50, 50);
  const extraChoices = (config.extraChoiceIds ?? [])
    .map((choiceId) => scene.choices.find((choice) => choice.id === choiceId))
    .filter((choice): choice is ChoiceDefinition => Boolean(choice));
  return `
    <section class="response-workbench quadrant-workbench" data-response-kind="quadrant">
      <div class="response-heading"><h2>二つの軸を別々に回答</h2><p>${escapeHtml(config.prompt)}</p></div>
      <div class="axis-control" data-axis-root="x">
        <label for="quadrant-x"><strong>${escapeHtml(config.xAxis.label)}</strong></label>
        <div class="slider-endpoints compact">
          <div><strong>${escapeHtml(config.xAxis.lowLabel)}</strong><small>${escapeHtml(config.xAxis.lowHint)}</small></div>
          <div><strong>${escapeHtml(config.xAxis.highLabel)}</strong><small>${escapeHtml(config.xAxis.highHint)}</small></div>
        </div>
        <input id="quadrant-x" class="decision-slider" type="range" min="0" max="100" step="1" value="50" data-quadrant-axis="x" data-touched="false">
      </div>
      <div class="axis-control" data-axis-root="y">
        <label for="quadrant-y"><strong>${escapeHtml(config.yAxis.label)}</strong></label>
        <div class="slider-endpoints compact">
          <div><strong>${escapeHtml(config.yAxis.lowLabel)}</strong><small>${escapeHtml(config.yAxis.lowHint)}</small></div>
          <div><strong>${escapeHtml(config.yAxis.highLabel)}</strong><small>${escapeHtml(config.yAxis.highHint)}</small></div>
        </div>
        <input id="quadrant-y" class="decision-slider" type="range" min="0" max="100" step="1" value="50" data-quadrant-axis="y" data-touched="false">
      </div>
      <div class="response-preview" data-response-preview>
        <span class="quadrant-dot" aria-hidden="true"></span>
        <div><strong>現在の方針</strong><p>${escapeHtml(config.summaries[initialKey])}</p></div>
      </div>
      <p class="response-note">初期位置による偏りを避けるため、二本とも一度動かしてください。</p>
      <button class="primary-button structured-submit" type="button" data-action="submit-quadrant" disabled>この方針で決定する</button>
      ${extraChoices.length ? `
        <div class="exception-choice">
          <p><strong>通常の二軸では表せない例外的な方針</strong></p>
          ${extraChoices.map((choice, index) => choiceCardMarkup(choice, index)).join("")}
        </div>` : ""}
    </section>`;
}

function renderAllocationResponse(scene: ResolvedScene, config: AllocationResponseConfig): string {
  return `
    <section class="response-workbench allocation-workbench" data-response-kind="allocation" data-budget="${config.budget}">
      <div class="response-heading"><h2>資源を配分して回答</h2><p>${escapeHtml(config.prompt)}</p></div>
      <div class="allocation-status"><span>残り</span><strong data-allocation-remaining>${config.budget}</strong><span>${escapeHtml(config.unitLabel)}</span></div>
      <div class="allocation-grid">
        ${config.items.map((item) => `
          <article class="allocation-item" data-allocation-item="${escapeHtml(item.id)}" data-count="0">
            <div><strong>${escapeHtml(item.label)}</strong><p>${escapeHtml(item.hint)}</p></div>
            <div class="allocation-controls">
              <button type="button" class="allocation-button" data-allocation-change="-1" data-item-id="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.label)}を1点減らす" disabled>−</button>
              <span class="allocation-count" data-allocation-count="${escapeHtml(item.id)}">0</span>
              <button type="button" class="allocation-button" data-allocation-change="1" data-item-id="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.label)}を1点増やす">＋</button>
            </div>
          </article>`).join("")}
      </div>
      <div class="response-preview" data-response-preview><div><strong>まだ配分が完了していません</strong><p>すべての点を使うと、選択内容を確認できます。</p></div></div>
      <button class="primary-button structured-submit" type="button" data-action="submit-allocation" disabled>この配分で決定する</button>
    </section>`;
}

function renderRankingResponse(scene: ResolvedScene, config: RankingResponseConfig, state: AppState): string {
  const configuredChoices = config.choiceIds
    .map((choiceId) => scene.choices.find((choice) => choice.id === choiceId))
    .filter((choice): choice is ChoiceDefinition => Boolean(choice));
  const ordered = deterministicOrder(configuredChoices, `${state.sessionSeed}:${scene.slotId}:ranking`);
  return `
    <section class="response-workbench ranking-workbench" data-response-kind="ranking">
      <div class="response-heading"><h2>優先順位で回答</h2><p>${escapeHtml(config.prompt)}</p></div>
      <p class="response-note">${escapeHtml(config.instructions)}</p>
      <ol class="ranking-list" data-ranking-list>
        ${ordered.map((choice, index) => `
          <li class="ranking-item" data-choice-id="${escapeHtml(choice.id)}">
            <span class="ranking-position">${index + 1}</span>
            <div><strong>${escapeHtml(choice.label)}</strong>${choice.detail ? `<small>${escapeHtml(choice.detail)}</small>` : ""}</div>
            <div class="ranking-controls">
              <button type="button" data-rank-move="up" aria-label="上へ移動" ${index === 0 ? "disabled" : ""}>↑</button>
              <button type="button" data-rank-move="down" aria-label="下へ移動" ${index === ordered.length - 1 ? "disabled" : ""}>↓</button>
            </div>
          </li>`).join("")}
      </ol>
      <div class="response-preview"><div><strong>最上位の行動を実行</strong><p>二位以下も、あなたが何を次に考えたかを示す補助データとして保存されます。</p></div></div>
      <button class="primary-button structured-submit" type="button" data-action="submit-ranking">この順位で決定する</button>
    </section>`;
}

function renderResponseInterface(scene: ResolvedScene, state: AppState): string {
  const config = RESPONSE_CONFIGS[scene.slotId];
  if (!config) {
    return `<div class="choice-list ui-${escapeHtml(scene.ui)}">${scene.choices.map(choiceCardMarkup).join("")}</div>`;
  }
  switch (config.kind) {
    case "slider": return renderSliderResponse(scene, config);
    case "quadrant": return renderQuadrantResponse(scene, config);
    case "allocation": return renderAllocationResponse(scene, config);
    case "ranking": return renderRankingResponse(scene, config, state);
  }
}

function renderScene(): void {
  if (!session) return renderLanding();
  const scene = resolveScene(session.state);
  document.title = `${scene.title}｜${APP_CONFIG.scenarioTitle}`;
  app.innerHTML = `
    <div class="play-page">
      ${pageHeader(true)}
      <main id="main-content" class="play-layout">
        ${progressPanel(session.state)}
        <section class="scene-column">
          <article class="scene-card">
            <div class="scene-meta">
              <span class="scene-id">${escapeHtml(scene.slotId)}</span>
              <span class="ui-badge">${escapeHtml(UI_LABELS[scene.ui])}</span>
              <span class="state-badge">ACT ${scene.act}</span>
            </div>
            <h1>${escapeHtml(scene.title)}</h1>
            ${readAloudMarkup(scene)}
            ${sceneGuideMarkup(scene)}
            <h2 class="decision-heading">どうする？</h2>
            ${renderResponseInterface(scene, session.state)}
          </article>
          <div class="play-actions">
            <button class="secondary-button" type="button" data-action="undo" ${session.snapshots.length === 0 ? "disabled" : ""}>一つ前のSceneへ戻る</button>
            <button class="text-button" type="button" data-action="home">トップへ戻る</button>
          </div>
        </section>
        ${investigationPanel(session.state)}
      </main>
      ${pageFooter()}
    </div>
    <div class="toast-region" aria-live="assertive" aria-atomic="true"></div>`;
}

function renderOutcome(): void {
  if (!session?.pendingOutcome) return renderScene();
  const outcome = session.pendingOutcome;
  const isFinal = session.state.history.length >= MEASUREMENT_ORDER.length;
  document.title = `選択の帰結｜${APP_CONFIG.scenarioTitle}`;
  app.innerHTML = `
    <div class="play-page">
      ${pageHeader(true)}
      <main id="main-content" class="play-layout">
        ${progressPanel(session.state)}
        <section class="scene-column">
          <article class="outcome-card">
            <p class="outcome-kicker">CHOICE RECORDED</p>
            <h1>${escapeHtml(outcome.sceneTitle)}</h1>
            <p class="outcome-choice">選択：${escapeHtml(outcome.choiceLabel)}${outcome.followUpLabel ? `<br>追加決定：${escapeHtml(outcome.followUpLabel)}` : ""}</p>
            ${outcome.responseSummary ? `<p class="outcome-response-summary">${escapeHtml(outcome.responseSummary)}</p>` : ""}
            <p class="outcome-text">${escapeHtml(outcome.outcome)}</p>
            ${outcome.diceRoll !== undefined ? `
              <div class="dice-result ${outcome.diceSuccess ? "success" : "failure"}">
                <span class="dice-number">${outcome.diceRoll}</span>
                <span><strong>${outcome.diceSuccess ? "判定成功" : "判定失敗"}</strong><br>出目は物語だけに影響し、能力値の採点には使用されません。</span>
              </div>` : ""}
            <div class="play-actions">
              <button class="secondary-button" type="button" data-action="undo">選択をやり直す</button>
              <button class="primary-button" type="button" data-action="next">${isFinal ? "探索者シートを確認する" : "次のSceneへ"}</button>
            </div>
          </article>
        </section>
        ${investigationPanel(session.state)}
      </main>
      ${pageFooter()}
    </div>
    <div class="toast-region" aria-live="assertive" aria-atomic="true"></div>`;
}

function statusGrid(abilities: readonly AbilityResult[]): string {
  return abilities.map((ability) => `
    <div class="status-row">
      <span class="status-key">${escapeHtml(ability.shortLabel)}</span>
      <span class="status-name"><strong>${escapeHtml(ability.label)}</strong><small>${escapeHtml(ability.diceFamily)}</small></span>
      <span class="status-value">${ability.value}</span>
    </div>`).join("");
}

function playLog(sessionValue: PersistedSession): string {
  return sessionValue.state.history.map((entry, index) => {
    const snapshot = sessionValue.snapshots[index];
    if (!snapshot) return "";
    const scene = resolveScene(snapshot, entry.slotId);
    const choice = scene.choices.find((candidate) => candidate.id === entry.selectedChoiceId);
    return `
      <li class="log-entry">
        <span class="log-slot">${escapeHtml(entry.slotId)}</span>
        <span class="log-copy"><strong>${escapeHtml(scene.title)}</strong><span>${escapeHtml(choice?.label ?? entry.selectedChoiceId)}</span></span>
      </li>`;
  }).join("");
}

function kuramochiCards(state: AppState): string {
  const cards = (["A", "B", "C"] as const)
    .filter((id) => state.kuramochi.variants[id].visible || state.kuramochi.firstInformationSource === id || state.kuramochi.fixedVariant === id)
    .map((id) => {
      const card = KURAMOCHI_CARDS[id];
      const selected = state.kuramochi.fixedVariant === id;
      return `
        <article class="trait-card">
          <strong>${escapeHtml(card.title)}${selected ? "｜現実へ固定" : ""}</strong>
          <p>${escapeHtml(card.summary)}</p>
        </article>`;
    });
  if (state.kuramochi.multipleFixation) {
    cards.push(`<article class="trait-card"><strong>複数固定</strong><p>単一固定機構を解除し、複数の時間状態を同時に現実へ残しました。</p></article>`);
  }
  return cards.join("") || `<p class="profile-copy">倉持の時間状態を十分に観測しないまま事件を終えました。</p>`;
}

function surveyOptions(selected: string | undefined, values: readonly string[]): string {
  return values.map((value) => `<option value="${escapeHtml(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("");
}

function renderResult(): void {
  if (!session) return renderLanding();
  const abilities = getAbilityResults(session.state);
  const ending = determineEnding(session.state);
  const profileTitle = buildProfileTitle(abilities);
  const profileSummary = buildProfileSummary(abilities);
  const distinctive = getDistinctiveAbilities(abilities, 2);
  const survey = loadSurvey();
  document.title = `${ending.title}｜${APP_CONFIG.appName}`;

  app.innerHTML = `
    <div class="result-page">
      ${pageHeader(true)}
      <main id="main-content" class="result-layout">
        <section class="result-hero">
          <div>
            <p class="ending-label">SCENARIO RESULT</p>
            <h1>${escapeHtml(ending.title)}</h1>
            <p class="ending-summary">${escapeHtml(ending.summary)}</p>
          </div>
          <div class="result-stamp">観測<br>完了</div>
        </section>

        <div class="result-grid">
          <section class="status-sheet">
            <div class="section-heading">
              <div><h2>探索者ステータス</h2><p>6版風・β版暫定換算</p></div>
              <span class="beta-badge">BETA</span>
            </div>
            <div class="status-grid">${statusGrid(abilities)}</div>
          </section>

          <section class="result-section">
            <div class="section-heading"><div><h2>行動プロファイル</h2><p>最も特徴的な二軸</p></div></div>
            <h3 class="profile-title">${escapeHtml(profileTitle)}</h3>
            <p class="profile-copy">${escapeHtml(profileSummary)}</p>
            <div class="trait-list">
              ${distinctive.map((ability) => `
                <article class="trait-card">
                  <strong>${escapeHtml(ability.shortLabel)} ${ability.value}｜${escapeHtml(ability.tendency === "high" ? ability.highTag : ability.lowTag)}</strong>
                  <p>${escapeHtml(ability.tendency === "high" ? ability.highDescription : ability.lowDescription)}</p>
                </article>`).join("")}
            </div>
          </section>
        </div>

        <section class="result-section">
          <div class="section-heading"><div><h2>選択傾向図</h2><p>能力値間ではなく、各軸内のβパーセンタイルを比較</p></div></div>
          <div class="radar-wrap"><canvas id="radar-chart" class="radar-canvas" width="760" height="760" aria-label="10軸の選択傾向図"></canvas></div>
        </section>

        <section class="result-section">
          <div class="section-heading"><div><h2>事件の記録</h2><p>能力値採点とは別の物語状態</p></div></div>
          <div class="result-grid">
            <div>
              <p><strong>停止手掛かり：</strong>${stopClueCount(session.state)}　<strong>曲面封鎖：</strong>${sealClueCount(session.state)}　<strong>四棟回路：</strong>${networkClueCount(session.state)}　<strong>固定：</strong>${fixationClueCount(session.state)}</p>
              <p><strong>猟犬の認識段階：</strong>H${session.state.mythos.houndStage}　<strong>倉持固定安定度：</strong>${session.state.kuramochi.fixationStability}</p>
            </div>
            <div class="trait-list">${kuramochiCards(session.state)}</div>
          </div>
        </section>

        <section class="result-section">
          <div class="section-heading"><div><h2>結果を残す</h2><p>画像・文章・プレイログ</p></div></div>
          <div class="result-actions">
            <button class="primary-button" type="button" data-action="download-image">結果画像を保存</button>
            <button class="secondary-button" type="button" data-action="share-result">共有する</button>
            <button class="secondary-button" type="button" data-action="copy-result">結果文をコピー</button>
            <button class="secondary-button" type="button" data-action="export-log">プレイログJSON</button>
            <button class="secondary-button" type="button" data-action="undo">最後の選択へ戻る</button>
          </div>
          <p class="hero-meta">能力値は公開初期用の固定β換算です。回答データが蓄積した正式校正とは異なります。</p>
        </section>

        <details class="result-section">
          <summary>24Sceneの選択履歴を表示</summary>
          <ol class="log-list">${playLog(session)}</ol>
        </details>

        <details class="survey-card">
          <summary>任意アンケート（診断後のみ）</summary>
          <p class="profile-copy">回答しなくても結果・画像・共有機能はすべて利用できます。能力値の採点や換算には使用しません。</p>
          <form id="survey-form">
            <div class="survey-grid">
              <div class="form-field"><label for="cocExperience">CoC経験</label><select id="cocExperience" name="cocExperience">${surveyOptions(survey?.cocExperience, ["回答しない", "未経験", "見学・配信視聴のみ", "1～2回", "3～10回", "11回以上", "継続的に遊んでいる"])}</select></div>
              <div class="form-field"><label for="plExperience">PL経験</label><select id="plExperience" name="plExperience">${surveyOptions(survey?.plExperience, ["回答しない", "経験なし", "1～2回", "3～10回", "11回以上", "継続的に経験している"])}</select></div>
              <div class="form-field"><label for="kpExperience">KP経験</label><select id="kpExperience" name="kpExperience">${surveyOptions(survey?.kpExperience, ["回答しない", "経験なし", "1～2回", "3～10回", "11回以上", "継続的に経験している"])}</select></div>
              <div class="form-field"><label for="scenarioCreationExperience">シナリオ制作経験</label><select id="scenarioCreationExperience" name="scenarioCreationExperience">${surveyOptions(survey?.scenarioCreationExperience, ["回答しない", "経験なし", "アイデア・草案のみ", "身内向けに制作", "公開経験あり", "複数作品を公開"])}</select></div>
            </div>
            <div class="result-actions"><button class="secondary-button" type="submit">任意回答を保存</button></div>
          </form>
        </details>

        <section class="result-actions">
          <button class="danger-button" type="button" data-action="restart">別の選択で最初から</button>
          <button class="text-button" type="button" data-action="clear">保存データを削除</button>
        </section>
      </main>
      ${pageFooter()}
    </div>
    <div class="toast-region" aria-live="assertive" aria-atomic="true"></div>`;

  requestAnimationFrame(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("#radar-chart");
    if (canvas) drawRadarChart(canvas, abilities);
  });

  void maybeSendCompletedDiagnosis(ending, abilities);
}

function renderSession(): void {
  if (!session) return renderLanding();
  if (session.phase === "outcome") renderOutcome();
  else if (session.phase === "result") renderResult();
  else renderScene();
}

function render(): void {
  if (pageMode === "landing") renderLanding();
  else renderSession();
}

function startNew(): void {
  session = buildSession();
  pageMode = "session";
  persist();
  renderScene();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resumeSession(): void {
  if (!session) return startNew();
  pageMode = "session";
  renderSession();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function goHome(): void {
  pageMode = "landing";
  renderLanding();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showDialog(content: string): HTMLDialogElement {
  const dialog = document.createElement("dialog");
  dialog.innerHTML = `<div class="dialog-content">${content}</div>`;
  document.body.append(dialog);
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  dialog.showModal();
  return dialog;
}


function activeStructuredScene(kind: "slider"): { scene: ResolvedScene; config: SliderResponseConfig } | null;
function activeStructuredScene(kind: "quadrant"): { scene: ResolvedScene; config: QuadrantResponseConfig } | null;
function activeStructuredScene(kind: "allocation"): { scene: ResolvedScene; config: AllocationResponseConfig } | null;
function activeStructuredScene(kind: "ranking"): { scene: ResolvedScene; config: RankingResponseConfig } | null;
function activeStructuredScene(kind: StructuredResponseConfig["kind"]): { scene: ResolvedScene; config: StructuredResponseConfig } | null {
  if (!session || session.phase !== "scene") return null;
  const scene = resolveScene(session.state);
  const config = RESPONSE_CONFIGS[scene.slotId];
  if (!config || config.kind !== kind) return null;
  return { scene, config };
}

function updateSliderWorkbench(input: HTMLInputElement): void {
  const active = activeStructuredScene("slider");
  if (!active) return;
  input.dataset.touched = "true";
  const value = Number(input.value);
  const band = sliderBand(active.config, value);
  const root = input.closest<HTMLElement>("[data-response-kind='slider']");
  if (!root) return;
  const valueElement = root.querySelector<HTMLElement>("[data-response-value]");
  const preview = root.querySelector<HTMLElement>("[data-response-preview]");
  const submit = root.querySelector<HTMLButtonElement>("[data-action='submit-slider']");
  if (valueElement) valueElement.textContent = String(value);
  if (preview) preview.innerHTML = `<span class="response-value">${value}</span><div><strong>${escapeHtml(band.label)}</strong><p>${escapeHtml(band.explanation)}</p></div>`;
  if (submit) submit.disabled = false;
}

function submitSliderResponse(): void {
  const active = activeStructuredScene("slider");
  const input = document.querySelector<HTMLInputElement>("[data-slider-control]");
  if (!active || !input || input.dataset.touched !== "true") return;
  const value = Number(input.value);
  const band = sliderBand(active.config, value);
  requestChoice(
    band.choiceId,
    {
      kind: "slider",
      value,
      selectedBand: band.choiceId,
      axisEvidence: {
        [active.config.minAxis]: -normalizeResponseValue(value),
        [active.config.maxAxis]: normalizeResponseValue(value)
      }
    },
    `判断位置 ${value}/100：${band.label}。${band.explanation}`
  );
}

function updateQuadrantWorkbench(input: HTMLInputElement): void {
  const active = activeStructuredScene("quadrant");
  if (!active) return;
  input.dataset.touched = "true";
  const root = input.closest<HTMLElement>("[data-response-kind='quadrant']");
  if (!root) return;
  const xInput = root.querySelector<HTMLInputElement>("[data-quadrant-axis='x']");
  const yInput = root.querySelector<HTMLInputElement>("[data-quadrant-axis='y']");
  if (!xInput || !yInput) return;
  const x = Number(xInput.value);
  const y = Number(yInput.value);
  const key = quadrantKey(x, y);
  const preview = root.querySelector<HTMLElement>("[data-response-preview]");
  const submit = root.querySelector<HTMLButtonElement>("[data-action='submit-quadrant']");
  if (preview) {
    preview.innerHTML = `<span class="quadrant-dot" style="--x:${x}%;--y:${100 - y}%" aria-hidden="true"></span><div><strong>現在の方針｜${x} / ${y}</strong><p>${escapeHtml(active.config.summaries[key])}</p></div>`;
  }
  if (submit) submit.disabled = !(xInput.dataset.touched === "true" && yInput.dataset.touched === "true");
}

function submitQuadrantResponse(): void {
  const active = activeStructuredScene("quadrant");
  const root = document.querySelector<HTMLElement>("[data-response-kind='quadrant']");
  const xInput = root?.querySelector<HTMLInputElement>("[data-quadrant-axis='x']");
  const yInput = root?.querySelector<HTMLInputElement>("[data-quadrant-axis='y']");
  if (!active || !xInput || !yInput) return;
  if (xInput.dataset.touched !== "true" || yInput.dataset.touched !== "true") return;
  const x = Number(xInput.value);
  const y = Number(yInput.value);
  const key = quadrantKey(x, y);
  const choiceId = active.config.choices[key];
  requestChoice(
    choiceId,
    {
      kind: "quadrant",
      x,
      y,
      quadrant: key,
      axisEvidence: {
        [active.config.xAxis.axis]: normalizeResponseValue(x),
        [active.config.yAxis.axis]: normalizeResponseValue(y)
      }
    },
    `${active.config.xAxis.label} ${x}/100、${active.config.yAxis.label} ${y}/100。${active.config.summaries[key]}`
  );
}

function allocationValues(root: HTMLElement, config: AllocationResponseConfig): Record<string, number> {
  const values: Record<string, number> = {};
  for (const item of config.items) {
    const element = root.querySelector<HTMLElement>(`[data-allocation-item='${item.id}']`);
    values[item.id] = Number(element?.dataset.count ?? 0);
  }
  return values;
}

function updateAllocationWorkbench(root: HTMLElement, config: AllocationResponseConfig): void {
  const values = allocationValues(root, config);
  const used = Object.values(values).reduce((sum, value) => sum + value, 0);
  const remaining = config.budget - used;
  const remainingElement = root.querySelector<HTMLElement>("[data-allocation-remaining]");
  if (remainingElement) remainingElement.textContent = String(remaining);

  for (const item of config.items) {
    const count = values[item.id] ?? 0;
    const countElement = root.querySelector<HTMLElement>(`[data-allocation-count='${item.id}']`);
    if (countElement) countElement.textContent = String(count);
    const minus = root.querySelector<HTMLButtonElement>(`[data-item-id='${item.id}'][data-allocation-change='-1']`);
    const plus = root.querySelector<HTMLButtonElement>(`[data-item-id='${item.id}'][data-allocation-change='1']`);
    if (minus) minus.disabled = count <= 0;
    if (plus) plus.disabled = remaining <= 0;
  }

  const preview = root.querySelector<HTMLElement>("[data-response-preview]");
  const submit = root.querySelector<HTMLButtonElement>("[data-action='submit-allocation']");
  if (remaining > 0) {
    if (preview) preview.innerHTML = `<div><strong>残り${remaining}${escapeHtml(config.unitLabel)}</strong><p>すべての点を使うと決定できます。</p></div>`;
    if (submit) submit.disabled = true;
    return;
  }

  const max = Math.max(...Object.values(values));
  const dominant = config.items.filter((item) => values[item.id] === max);
  const summary = dominant.length === 1
    ? `${dominant[0]!.label}へ最も多く配分`
    : config.balancedLabel;
  if (preview) {
    preview.innerHTML = `<div><strong>${escapeHtml(summary)}</strong><p>${config.items.map((item) => `${escapeHtml(item.label)} ${values[item.id]}${escapeHtml(config.unitLabel)}`).join(" ／ ")}</p></div>`;
  }
  if (submit) submit.disabled = false;
}

function changeAllocation(button: HTMLButtonElement): void {
  const active = activeStructuredScene("allocation");
  const root = button.closest<HTMLElement>("[data-response-kind='allocation']");
  const itemId = button.dataset.itemId;
  const delta = Number(button.dataset.allocationChange ?? 0);
  if (!active || !root || !itemId || !delta) return;
  const item = root.querySelector<HTMLElement>(`[data-allocation-item='${itemId}']`);
  if (!item) return;
  const values = allocationValues(root, active.config);
  const used = Object.values(values).reduce((sum, value) => sum + value, 0);
  const current = Number(item.dataset.count ?? 0);
  if (delta > 0 && used >= active.config.budget) return;
  if (delta < 0 && current <= 0) return;
  item.dataset.count = String(current + delta);
  updateAllocationWorkbench(root, active.config);
}

function submitAllocationResponse(): void {
  const active = activeStructuredScene("allocation");
  const root = document.querySelector<HTMLElement>("[data-response-kind='allocation']");
  if (!active || !root) return;
  const values = allocationValues(root, active.config);
  const used = Object.values(values).reduce((sum, value) => sum + value, 0);
  if (used !== active.config.budget) return;
  const max = Math.max(...Object.values(values));
  const dominant = active.config.items.filter((item) => values[item.id] === max);
  const choiceId = dominant.length === 1 ? dominant[0]!.dominantChoiceId : active.config.balancedChoiceId;
  const summary = active.config.items.map((item) => `${item.label} ${values[item.id]}${active.config.unitLabel}`).join("、");
  requestChoice(
    choiceId,
    {
      kind: "allocation",
      budget: active.config.budget,
      allocations: values,
      axisEvidence: allocationAxisEvidence(active.scene, active.config, values)
    },
    `資源配分：${summary}。${dominant.length === 1 ? `${dominant[0]!.label}を最優先` : active.config.balancedLabel}。`
  );
}

function refreshRankingList(list: HTMLOListElement): void {
  const items = [...list.querySelectorAll<HTMLElement>("[data-choice-id]")];
  items.forEach((item, index) => {
    const position = item.querySelector<HTMLElement>(".ranking-position");
    if (position) position.textContent = String(index + 1);
    const up = item.querySelector<HTMLButtonElement>("[data-rank-move='up']");
    const down = item.querySelector<HTMLButtonElement>("[data-rank-move='down']");
    if (up) up.disabled = index === 0;
    if (down) down.disabled = index === items.length - 1;
  });
}

function moveRankingItem(button: HTMLButtonElement): void {
  const list = button.closest<HTMLOListElement>("[data-ranking-list]");
  const item = button.closest<HTMLElement>("[data-choice-id]");
  if (!list || !item) return;
  const direction = button.dataset.rankMove;
  if (direction === "up" && item.previousElementSibling) {
    list.insertBefore(item, item.previousElementSibling);
  } else if (direction === "down" && item.nextElementSibling) {
    list.insertBefore(item.nextElementSibling, item);
  }
  refreshRankingList(list);
}

function submitRankingResponse(): void {
  const active = activeStructuredScene("ranking");
  const list = document.querySelector<HTMLOListElement>("[data-ranking-list]");
  if (!active || !list) return;
  const order = [...list.querySelectorAll<HTMLElement>("[data-choice-id]")]
    .map((item) => item.dataset.choiceId)
    .filter((value): value is string => Boolean(value));
  const top = order[0];
  if (!top) return;
  const labels = order.map((choiceId) => active.scene.choices.find((choice) => choice.id === choiceId)?.label ?? choiceId);
  requestChoice(
    top,
    { kind: "ranking", order, axisEvidence: rankingAxisEvidence(active.scene, order) },
    `優先順位：${labels.map((label, index) => `${index + 1}. ${label}`).join(" ／ ")}`
  );
}

function requestChoice(choiceId: string, responseMetadata: ResponseMetadata = { kind: "choice" }, responseSummary?: string): void {
  if (!session || session.phase !== "scene") return;
  const scene = resolveScene(session.state);
  const choice = scene.choices.find((candidate) => candidate.id === choiceId);
  if (!choice) return;

  if (choice.followUp) {
    const dialog = showDialog(`
      <h2>${escapeHtml(choice.label)}</h2>
      <p>${escapeHtml(choice.followUp.prompt)}</p>
      <div class="followup-list">
        ${choice.followUp.options.map((option) => `<button class="followup-button" type="button" data-follow-up="${escapeHtml(option.id)}">${escapeHtml(option.label)}</button>`).join("")}
      </div>
      <div class="dialog-actions"><button class="secondary-button" type="button" data-close-dialog>選び直す</button></div>`);
    dialog.querySelectorAll<HTMLButtonElement>("[data-follow-up]").forEach((button) => {
      button.addEventListener("click", () => {
        const followUpId = button.dataset.followUp;
        dialog.close();
        if (followUpId) commitChoice(choiceId, followUpId, responseMetadata, responseSummary);
      });
    });
    dialog.querySelector<HTMLButtonElement>("[data-close-dialog]")?.addEventListener("click", () => dialog.close());
    return;
  }

  const dialog = showDialog(`
    <h2>この行動を選びますか？</h2>
    <p><strong>${escapeHtml(choice.label)}</strong></p>
    ${responseSummary ? `<p class="dialog-response-summary">${escapeHtml(responseSummary)}</p>` : ""}
    ${choice.detail ? `<p>${escapeHtml(choice.detail)}</p>` : ""}
    ${choice.usesDice ? `<p class="dice-badge">この選択では1D100を一度だけ振ります。戻って同じ選択をしても出目は変わりません。</p>` : ""}
    <div class="dialog-actions">
      <button class="secondary-button" type="button" data-close-dialog>戻る</button>
      <button class="primary-button" type="button" data-confirm-choice>この行動を実行する</button>
    </div>`);
  dialog.querySelector<HTMLButtonElement>("[data-close-dialog]")?.addEventListener("click", () => dialog.close());
  dialog.querySelector<HTMLButtonElement>("[data-confirm-choice]")?.addEventListener("click", () => {
    dialog.close();
    commitChoice(choiceId, undefined, responseMetadata, responseSummary);
  });
}

function commitChoice(choiceId: string, followUpOptionId?: string, responseMetadata: ResponseMetadata = { kind: "choice" }, responseSummary?: string): void {
  if (!session) return;
  const snapshot = cloneState(session.state);
  const result = applyChoice(session.state, choiceId, followUpOptionId, undefined, responseMetadata);
  session.snapshots.push(snapshot);
  session.state = result.state;
  const pending: PendingOutcome = {
    slotId: result.scene.slotId,
    sceneTitle: result.scene.title,
    choiceId: result.choice.id,
    choiceLabel: result.choice.label,
    outcome: result.choice.outcome
  };
  if (result.followUpOption) pending.followUpLabel = result.followUpOption.label;
  if (result.diceRoll !== undefined) pending.diceRoll = result.diceRoll;
  if (result.diceSuccess !== undefined) pending.diceSuccess = result.diceSuccess;
  if (responseSummary) pending.responseSummary = responseSummary;
  session.pendingOutcome = pending;
  session.phase = "outcome";
  persist();
  renderOutcome();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function nextScene(): void {
  if (!session) return;
  session.pendingOutcome = null;
  if (session.state.history.length >= MEASUREMENT_ORDER.length) {
    session.phase = "result";
    session.completedAt ??= currentDateTime();
    persist();
    renderResult();
  } else {
    session.phase = "scene";
    persist();
    renderScene();
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function undoLastChoice(): void {
  if (!session || session.snapshots.length === 0) return;
  const snapshot = session.snapshots.pop();
  if (!snapshot) return;
  session.state = snapshot;
  session.phase = "scene";
  session.pendingOutcome = null;
  session.completedAt = null;
  persist();
  renderScene();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function confirmRestart(): void {
  const dialog = showDialog(`
    <h2>診断を最初からやり直しますか？</h2>
    <p>現在の選択履歴と結果は、このブラウザから削除されます。</p>
    <div class="dialog-actions">
      <button class="secondary-button" type="button" data-close-dialog>続ける</button>
      <button class="danger-button" type="button" data-confirm-restart>最初からやり直す</button>
    </div>`);
  dialog.querySelector<HTMLButtonElement>("[data-close-dialog]")?.addEventListener("click", () => dialog.close());
  dialog.querySelector<HTMLButtonElement>("[data-confirm-restart]")?.addEventListener("click", () => {
    dialog.close();
    clearSession();
    session = null;
    startNew();
  });
}

function confirmClear(): void {
  const dialog = showDialog(`
    <h2>保存データを削除しますか？</h2>
    <p>診断の途中状態、結果、任意アンケートをこのブラウザから削除します。</p>
    <div class="dialog-actions">
      <button class="secondary-button" type="button" data-close-dialog>キャンセル</button>
      <button class="danger-button" type="button" data-confirm-clear>削除する</button>
    </div>`);
  dialog.querySelector<HTMLButtonElement>("[data-close-dialog]")?.addEventListener("click", () => dialog.close());
  dialog.querySelector<HTMLButtonElement>("[data-confirm-clear]")?.addEventListener("click", () => {
    dialog.close();
    clearAllLocalData();
    session = null;
    pageMode = "landing";
    renderLanding();
    showToast("保存データを削除しました");
  });
}

function resultText(ending: EndingDefinition, abilities: readonly AbilityResult[]): string {
  const status = abilities.map((ability) => `${ability.shortLabel} ${ability.value}`).join(" / ");
  const url = APP_CONFIG.shareUrl.trim() || (location.href.split("#")[0] ?? location.href);
  return `${APP_CONFIG.appName}『${APP_CONFIG.scenarioTitle}』\n${ending.title}\n${buildProfileTitle(abilities)}\n${status}\n${url}`;
}

async function downloadResultImage(): Promise<void> {
  if (!session) return;
  const abilities = getAbilityResults(session.state);
  const ending = determineEnding(session.state);
  const blob = await createResultCardBlob({
    abilities,
    ending,
    profileTitle: buildProfileTitle(abilities),
    profileSummary: buildProfileSummary(abilities),
    config: APP_CONFIG
  });
  downloadBlob(blob, `coc-status-${session.state.sessionSeed.slice(0, 8)}.png`);
  showToast("結果画像を保存しました");
}

async function shareResult(): Promise<void> {
  if (!session) return;
  const abilities = getAbilityResults(session.state);
  const ending = determineEnding(session.state);
  const text = resultText(ending, abilities);
  const blob = await createResultCardBlob({
    abilities,
    ending,
    profileTitle: buildProfileTitle(abilities),
    profileSummary: buildProfileSummary(abilities),
    config: APP_CONFIG
  });
  const file = new File([blob], "coc-status-result.png", { type: "image/png" });
  const shareData: ShareData = { title: APP_CONFIG.appName, text, files: [file] };
  if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
    try {
      await navigator.share(shareData);
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }
  downloadBlob(blob, `coc-status-${session.state.sessionSeed.slice(0, 8)}.png`);
  await navigator.clipboard?.writeText(text);
  showToast("画像を保存し、結果文をコピーしました");
}

async function copyResult(): Promise<void> {
  if (!session) return;
  const abilities = getAbilityResults(session.state);
  const ending = determineEnding(session.state);
  await navigator.clipboard.writeText(resultText(ending, abilities));
  showToast("結果文をコピーしました");
}

function exportLog(): void {
  if (!session) return;
  const abilities = getAbilityResults(session.state);
  const ending = determineEnding(session.state);
  const payload = {
    appVersion: APP_CONFIG.version,
    coreVersion: "0.6.0",
    exportedAt: currentDateTime(),
    sessionId: session.state.sessionSeed,
    ending,
    abilities,
    history: session.state.history,
    finalState: {
      story: session.state.story,
      observer: session.state.observer,
      mythos: session.state.mythos,
      kuramochi: session.state.kuramochi,
      diagnostic: session.state.diagnostic
    }
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  downloadBlob(blob, `coc-status-playlog-${session.state.sessionSeed.slice(0, 8)}.json`);
  showToast("プレイログを保存しました");
}

async function maybeSendCompletedDiagnosis(ending: EndingDefinition, abilities: readonly AbilityResult[]): Promise<void> {
  if (!session || !isRemoteCollectionEnabled() || wasSessionSent(session.state.sessionSeed)) return;
  const sent = await sendCompletedDiagnosis(APP_CONFIG, session.state, ending, abilities);
  if (sent) markSessionSent(session.state.sessionSeed);
}

async function submitSurvey(form: HTMLFormElement): Promise<void> {
  if (!session) return;
  const data = new FormData(form);
  const survey: OptionalSurvey = {
    cocExperience: String(data.get("cocExperience") ?? "回答しない"),
    plExperience: String(data.get("plExperience") ?? "回答しない"),
    kpExperience: String(data.get("kpExperience") ?? "回答しない"),
    scenarioCreationExperience: String(data.get("scenarioCreationExperience") ?? "回答しない"),
    savedAt: currentDateTime()
  };
  saveSurvey(survey);
  if (isRemoteCollectionEnabled()) {
    await sendOptionalSurvey(APP_CONFIG, session.state.sessionSeed, survey);
  }
  showToast("任意アンケートを保存しました");
}

function showToast(message: string): void {
  const region = document.querySelector<HTMLElement>(".toast-region");
  if (!region) return;
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.dataset.toastId = String(++toastCounter);
  toast.textContent = message;
  region.append(toast);
  window.setTimeout(() => toast.remove(), 3200);
}

app.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;

  const allocationButton = target.closest<HTMLButtonElement>("button[data-allocation-change]");
  if (allocationButton) {
    changeAllocation(allocationButton);
    return;
  }

  const rankButton = target.closest<HTMLButtonElement>("button[data-rank-move]");
  if (rankButton) {
    moveRankingItem(rankButton);
    return;
  }

  const choiceButton = target.closest<HTMLButtonElement>("button[data-choice-id]");
  if (choiceButton?.dataset.choiceId) {
    requestChoice(choiceButton.dataset.choiceId);
    return;
  }

  const actionButton = target.closest<HTMLElement>("[data-action]");
  const action = actionButton?.dataset.action;
  if (!action) return;
  switch (action) {
    case "start": startNew(); break;
    case "resume": resumeSession(); break;
    case "home": goHome(); break;
    case "next": nextScene(); break;
    case "undo": undoLastChoice(); break;
    case "restart": confirmRestart(); break;
    case "clear": confirmClear(); break;
    case "submit-slider": submitSliderResponse(); break;
    case "submit-quadrant": submitQuadrantResponse(); break;
    case "submit-allocation": submitAllocationResponse(); break;
    case "submit-ranking": submitRankingResponse(); break;
    case "download-image": void downloadResultImage().catch((error) => showToast(String(error))); break;
    case "share-result": void shareResult().catch((error) => showToast(String(error))); break;
    case "copy-result": void copyResult().catch((error) => showToast(String(error))); break;
    case "export-log": exportLog(); break;
  }
});

app.addEventListener("input", (event) => {
  const input = event.target as HTMLInputElement;
  if (input.matches("[data-slider-control]")) {
    updateSliderWorkbench(input);
    return;
  }
  if (input.matches("[data-quadrant-axis]")) updateQuadrantWorkbench(input);
});

app.addEventListener("submit", (event) => {
  const form = event.target as HTMLFormElement;
  if (form.id !== "survey-form") return;
  event.preventDefault();
  void submitSurvey(form);
});

document.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (document.querySelector("dialog[open]")) return;
  if (pageMode !== "session" || session?.phase !== "scene") return;
  const index = Number(event.key) - 1;
  if (!Number.isInteger(index) || index < 0 || index > 8) return;
  const scene = resolveScene(session.state);
  if (RESPONSE_CONFIGS[scene.slotId]) return;
  const choice = scene.choices[index];
  if (choice) requestChoice(choice.id);
});

render();

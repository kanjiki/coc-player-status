from pathlib import Path

p = Path('src/app.ts')
s = p.read_text(encoding='utf-8')

old = '''function remainingTimeLabel(state: AppState): string {
  if (state.story.timeUnits > 0) return `猶予 ${state.story.timeUnits}`;
  if (state.story.timeUnits === 0) return "猶予なし";
  return `予定より遅延 ${Math.abs(state.story.timeUnits)}`;
}

function investigationPanel(state: AppState): string {
  const atmosphere = getAtmosphere(state);
  return `
    <aside class="investigation-panel" aria-label="調査状況">
      <h2>調査記録</h2>
      <dl class="case-list">
        <div class="case-row"><dt>現在地</dt><dd>${escapeHtml(displayLocation(state))}</dd></div>
        <div class="case-row"><dt>現地同行</dt><dd>${escapeHtml(localCompanionLabel(state))}</dd></div>
        <div class="case-row"><dt>通信</dt><dd>${escapeHtml(remoteContactLabel(state))}</dd></div>
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
}'''

new = '''function remainingTimeLabel(state: AppState): string {
  if (state.story.timeUnits >= 8) return "まだ余裕がある";
  if (state.story.timeUnits >= 4) return "少なくなってきた";
  if (state.story.timeUnits >= 1) return "ほとんど残っていない";
  if (state.story.timeUnits === 0) return "猶予なし";
  return "予定を超過している";
}

function investigationPanel(state: AppState): string {
  const atmosphere = getAtmosphere(state);
  const guide = SCENE_GUIDES[state.story.currentSlot as keyof typeof SCENE_GUIDES];
  return `
    <aside class="investigation-panel" aria-label="現在の状況">
      <h2>現在の状況</h2>
      <div class="atmosphere-meter">
        <span class="state-badge">いまの目的</span>
        <p>${escapeHtml(guide?.objective ?? "目の前の状況を確認する")}</p>
      </div>
      <dl class="case-list">
        <div class="case-row"><dt>いまいる場所</dt><dd>${escapeHtml(displayLocation(state))}</dd></div>
        <div class="case-row"><dt>一緒にいる人</dt><dd>${escapeHtml(localCompanionLabel(state))}</dd></div>
        <div class="case-row"><dt>連絡が取れる人</dt><dd>${escapeHtml(remoteContactLabel(state))}</dd></div>
        <div class="case-row"><dt>集めた手掛かり</dt><dd>${state.story.clues.length}件</dd></div>
        <div class="case-row"><dt>残り調査猶予</dt><dd>${escapeHtml(remainingTimeLabel(state))}</dd></div>
      </dl>
      <div class="atmosphere-meter">
        <span class="state-badge">いま確認できている異常</span>
        <p>${escapeHtml(atmosphere.label)}</p>
        <div class="atmosphere-track" aria-label="異常の深刻度">
          ${[1, 2, 3].map((level) => `<span class="${level <= atmosphere.active ? "active" : ""}"></span>`).join("")}
        </div>
      </div>
      ${debugMode ? `<pre class="debug-panel">${escapeHtml(JSON.stringify({ story: state.story, observer: state.observer, mythos: state.mythos, kuramochi: state.kuramochi }, null, 2))}</pre>` : ""}
    </aside>`;
}'''

if old not in s:
    raise SystemExit('situation panel marker not found')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

for file_name in ('package.json', 'public/site-config.js'):
    path = Path(file_name)
    text = path.read_text(encoding='utf-8')
    if '1.6.2-beta.1' in text:
        text = text.replace('1.6.2-beta.1', '1.6.3-beta.1')
    elif '1.6.1-beta.1' in text:
        text = text.replace('1.6.1-beta.1', '1.6.3-beta.1')
    else:
        raise SystemExit(f'version marker missing in {file_name}')
    path.write_text(text, encoding='utf-8')

test = Path('tests/situation-panel.test.mjs')
test.write_text('''import test from "node:test";\nimport assert from "node:assert/strict";\nimport fs from "node:fs";\n\nconst app = fs.readFileSync("src/app.ts", "utf8");\n\ntest("situation panel uses plain-language labels", () => {\n  for (const phrase of ["現在の状況", "いまの目的", "いまいる場所", "一緒にいる人", "連絡が取れる人", "残り調査猶予", "いま確認できている異常"]) {\n    assert.ok(app.includes(phrase), `missing: ${phrase}`);\n  }\n  assert.ok(!app.includes("return `猶予 ${state.story.timeUnits}`"));\n});\n''', encoding='utf-8')

print('plain-language situation UI applied')

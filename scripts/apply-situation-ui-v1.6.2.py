from pathlib import Path

p=Path('src/app.ts')
s=p.read_text(encoding='utf-8')
old='''function getAtmosphere(state: AppState): { label: string; active: number } {\n  if (state.mythos.houndStage >= 3) return { label: "角の向こうから見られている", active: 3 };\n  if (state.mythos.houndStage >= 2) return { label: "追跡の気配が離れない", active: 2 };\n  if (state.mythos.houndPressure >= 3) return { label: "青黒い煙が濃くなる", active: 2 };\n  return { label: "角で時計が止まっている", active: 1 };\n}\n'''
new='''function getAtmosphere(state: AppState): { label: string; active: number } {\n  if (state.mythos.houndStage >= 3) return { label: "細長い影が角からこちら側へ現れている", active: 3 };\n  if (state.mythos.houndStage >= 2) return { label: "角の奥の影が観測者を追って移動している", active: 3 };\n  if (state.mythos.houndPressure >= 3) return { label: "新しく露出した角から青黒い煙が漏れている", active: 2 };\n  if (state.history.length >= 8) return { label: "新しい角が増える場所で異常が強まっている", active: 2 };\n  return { label: "音声や記録に17分の時刻ずれが繰り返し現れている", active: 1 };\n}\n\nfunction displayLocation(state: AppState): string {\n  const slot = state.story.currentSlot;\n  const fixed: Partial<Record<string, string>> = {\n    M03: "管理会社・出発前",\n    M01: "管理会社・音声解析",\n    M06: "雨声荘・到着前",\n    M02: "雨声荘・封鎖入口",\n    L02: "雨声荘・管理室前",\n    M05: "雨声荘・二階北側",\n    M09: "雨声荘・二階北側の壁内区画",\n    M11: "雨声荘・内部廊下",\n    M04: "雨声荘・地下へ続く廊下",\n    L03: "雨声荘・地下分岐",\n    M07: "雨声荘・地下通路",\n    S01: "雨声荘・観測室前",\n    M08: "雨声荘・観測室前の保管棚",\n    M12: "雨声荘・中央実験区画への通路",\n    L01: "雨声荘・観測室前の変形床",\n    M15: "雨声荘・中央実験区画",\n    M14: "雨声荘・観測室",\n    S04: "雨声荘・観測室",\n    M13: "雨声荘・観測室",\n    M16: "雨声荘・観測室",\n    L04: "雨声荘・観測室",\n    S03: "雨声荘・観測室",\n    S02: "雨声荘・観測室"\n  };\n  if (slot === "M10") {\n    switch (state.story.routes.echo) {\n      case "follow": return "雨声荘・重なった予定外の部屋";\n      case "keep_plan": return "雨声荘・旧洗濯室";\n      case "limited_follow": return "雨声荘・時間残響区画";\n      case "seal": return "雨声荘・地下通路";\n    }\n  }\n  return fixed[slot] ?? LOCATION_LABELS[state.story.location] ?? state.story.location;\n}\n\nfunction localCompanionLabel(state: AppState): string {\n  return state.story.companion === "sumie_present" ? "須藤澄江" : "なし";\n}\n\nfunction remoteContactLabel(state: AppState): string {\n  if (state.story.companion === "sumie_remote") return "須藤澄江";\n  if (state.story.companion === "none") return "なし";\n  return "榊亜希";\n}\n'''
if old not in s: raise SystemExit('atmosphere block missing')
s=s.replace(old,new,1)
old2='''        <div class="case-row"><dt>現在地</dt><dd>${escapeHtml(LOCATION_LABELS[state.story.location] ?? state.story.location)}</dd></div>\n        <div class="case-row"><dt>同行</dt><dd>${escapeHtml(COMPANION_LABELS[state.story.companion])}</dd></div>'''
new2='''        <div class="case-row"><dt>現在地</dt><dd>${escapeHtml(displayLocation(state))}</dd></div>\n        <div class="case-row"><dt>現地同行</dt><dd>${escapeHtml(localCompanionLabel(state))}</dd></div>\n        <div class="case-row"><dt>通信</dt><dd>${escapeHtml(remoteContactLabel(state))}</dd></div>'''
if old2 not in s: raise SystemExit('panel rows missing')
s=s.replace(old2,new2,1)
# Avoid reviving the provisional 03:17 deadline in the side panel.
s=s.replace('if (state.story.timeUnits === 0) return "午前3時17分";','if (state.story.timeUnits === 0) return "猶予なし";',1)
s=s.replace('return `期限超過 ${Math.abs(state.story.timeUnits)}`;','return `予定より遅延 ${Math.abs(state.story.timeUnits)}`;',1)
p.write_text(s,encoding='utf-8')
for fn in ['package.json','public/site-config.js']:
 q=Path(fn); t=q.read_text(encoding='utf-8'); t=t.replace('1.6.1-beta.1','1.6.2-beta.1'); q.write_text(t,encoding='utf-8')
print('patched situation panel')

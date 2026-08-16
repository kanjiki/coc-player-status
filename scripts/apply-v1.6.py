from pathlib import Path


def replace_block(text: str, slot: str, next_slot: str, block: str) -> str:
    start = text.index(f"  {slot}: {{")
    end = text.index(f"  {next_slot}: {{", start)
    return text[:start] + block.rstrip() + "\n" + text[end:]


def replace_narration(text: str, slot: str, next_slot: str, block: str) -> str:
    start = text.index(f"  {slot}: `")
    end = text.index(f"  {next_slot}: `", start)
    return text[:start] + block.rstrip() + "\n\n" + text[end:]

# --- State-aware guide rendering -------------------------------------------------
app_path = Path("src/app.ts")
app = app_path.read_text(encoding="utf-8")
old_import = 'import { SCENE_GUIDES } from "./core/sceneGuides.js";'
new_import = old_import + '\nimport { getSceneKnownFacts } from "./core/sceneKnowledge.js";'
if new_import not in app:
    if old_import not in app:
        raise SystemExit("SCENE_GUIDES import not found")
    app = app.replace(old_import, new_import, 1)

old_sig = "function sceneGuideMarkup(scene: ResolvedScene): string {\n  const guide = SCENE_GUIDES[scene.slotId];"
new_sig = "function sceneGuideMarkup(scene: ResolvedScene, state: AppState): string {\n  const guide = SCENE_GUIDES[scene.slotId];\n  const knownFacts = getSceneKnownFacts(state, scene.slotId);"
if old_sig not in app:
    raise SystemExit("sceneGuideMarkup signature not found")
app = app.replace(old_sig, new_sig, 1)
app = app.replace('guide.knownFacts.map((fact)', 'knownFacts.map((fact)', 1)
if '${sceneGuideMarkup(scene)}' not in app:
    raise SystemExit("sceneGuideMarkup call not found")
app = app.replace('${sceneGuideMarkup(scene)}', '${sceneGuideMarkup(scene, session.state)}', 1)
app_path.write_text(app, encoding="utf-8")

# --- Guides: only universally known facts in base data ---------------------------
guides_path = Path("src/core/sceneGuides.ts")
guides = guides_path.read_text(encoding="utf-8")

blocks = {
"M01": '''  M01: {
    objective: "第二音声について、人物の記憶と記録上の異常のどちらを先に確かめるか決める。",
    knownFacts: [
      "分離した音声には、通常音声とは異なる時刻情報を持つ第二の声が含まれている。",
      "第二音声には、榊しか知らないはずの私的な言葉が含まれている。",
      "二本の声は呼吸や背後音が一致せず、単純な反響や同一録音の複製には見えない。"
    ],
    stakes: "榊本人へ確認すれば人物側の手掛かりが増え、記録を解析すれば現象側の手掛かりが増える。どちらも、まだ原因を断定できる段階ではない。",
    decisionPrompt: "最初に、人物の記憶と記録の構造のどちらへ踏み込みますか？",
    glossary: [{ term: "第二音声", definition: "分離処理で見つかった、通常音声とは異なる時刻情報と背景音を持つもう一本の音声。" }]
  },''',
"M02": '''  M02: {
    objective: "用途の分からない曲面改修をどう扱うか決めながら、雨声荘へ入る。",
    knownFacts: [
      "入口の壁と天井の境目は漆喰で丸く埋められ、曲面パネルが重ねられている。",
      "解体前調査で剥がされた箇所だけ、直角の金属枠が露出している。",
      "内部から倉持らしき声が聞こえ、露出した角では青黒い煙が一度だけ現れた。"
    ],
    stakes: "正面の改修を崩せば早く入れるが、冬城が残した構造を失う。別の入口を探せば時間がかかる。",
    decisionPrompt: "用途の分からない改修を残すか、直接開くか、まず反応を確かめますか？",
    glossary: [{ term: "曲面パネル", definition: "入口の壁・床・天井の接合部を丸く覆う古い建材。現時点では設置目的は分からない。" }]
  },''',
"M05": '''  M05: {
    objective: "二階北側で不足している約二メートル分の空間が、どこにあるか確かめる。",
    knownFacts: [
      "建物の外から測った長さと、二階北側の室内寸法が約二メートル一致しない。",
      "壁を叩く位置によって反響が変わり、一角だけ周囲よりわずかに温度が低い。",
      "現場の測定だけでも、壁の向こうに空間があるかを調べられる。"
    ],
    stakes: "記録を持っている場合は現場と照合できる。持っていない場合でも、音・温度・距離から推定できる。",
    decisionPrompt: "いま手元にある資料と現場情報を、どのように使って入口を探しますか？"
  },''',
"M11": '''  M11: {
    objective: "同行者または通信相手が再び行動できる状態を作り、調査を続ける。",
    knownFacts: [
      "角から、本人と同じ声で過去に言えなかった言葉が繰り返されている。",
      "相手は呼びかけには応じるが、その場からすぐには動けない。",
      "地下からの振動は続いており、長く留まるほど現地の状況は進行する。"
    ],
    stakes: "相手への対応に時間を使うか、役割を渡して進むか、退避させるかで、その後の同行状態が変わる。",
    decisionPrompt: "実際の卓で最初に優先したい順へ並べ替えてください。最上位の行動が実行されます。"
  },''',
"L03": '''  L03: {
    objective: "地下の旧実験区画へ進む経路を選ぶ。",
    knownFacts: [
      "崩落した近道には青黒い液体と、人間の靴跡とは合わない痕跡が残っている。",
      "遠回りのスロープは、壁と床の境まで丸く処理されている。",
      "崩落は一定間隔で小さく震えており、観察や補強に時間を使うこともできる。"
    ],
    stakes: "早い道ほど不確実性と現場危険が大きく、遠回りや観察は時間を使う。",
    decisionPrompt: "安全と到達速度の間で、どこまで危険側へ寄せますか？"
  },''',
"M07": '''  M07: {
    objective: "自分と同じ声が示す予定外の経路を、調査に取り入れるか決める。",
    knownFacts: [
      "声は予定していた経路とは逆方向から聞こえる。",
      "声は自分自身と同じ声で、『こちらへ来れば倉持に会える』と主張している。",
      "これまでの記録でも、十七分という時刻の食い違いが繰り返し現れている。"
    ],
    stakes: "声を追えば計画外の区画へ入り、無視すれば声が示す情報を捨てることになる。正体はまだ分からない。",
    decisionPrompt: "予定を維持しますか、それとも正体不明の声へどこまで付き合いますか？"
  },''',
"M10": '''  M10: {
    objective: "自分と同じ姿をした存在へ、どこまで接触するか決める。",
    knownFacts: [
      "目の前の存在は、外見と所持品が自分と一致している。",
      "その存在は、こちらが実際には行っていない行動について具体的に語る。",
      "映像、装置による再現、別の場所にいる存在のどれなのかは確定していない。"
    ],
    stakes: "質問して検証する、会話を続ける、経路情報だけ利用するなど、接触の深さを選べる。",
    decisionPrompt: "この存在を、まず何として扱いますか？"
  },''',
"S01": '''  S01: {
    objective: "観測窓に重なって見える複数の像を、どこまで観測するか決める。",
    knownFacts: [
      "特殊ガラスの向こうでは、同じ部屋が複数重なって見える。",
      "机には遠隔測定器と、装置へ直接つなぐ古い端子が残っている。",
      "冬城のメモには『見るほど、向こうからも見える』とだけ書かれている。"
    ],
    stakes: "観測量を増やせば情報も増えるが、何がこちらを見返すのかは分からない。観測しない、記録を壊す選択もある。",
    decisionPrompt: "どこまで見たいかと、そのための不可逆的な代償をどこまで受け入れるかを示してください。",
    glossary: [{ term: "時角干渉観測器", definition: "小窓の銘板に記された冬城の装置名。『時角』が何を意味するかは、この時点では説明されていない。" }]
  },''',
"M08": '''  M08: {
    objective: "冬城が残した記録のうち、どの範囲を優先して調べるか決める。",
    knownFacts: [
      "保管棚には、実験日誌、改修記録、雨声荘以外の住所を含む工事ファイルが残っている。",
      "後期の日誌では文字が乱れ、『雨声荘だけでは閉じない』という記述が繰り返されている。",
      "一棟の実験を深く追うことも、複数建物の関係を調べることもできる。"
    ],
    stakes: "一地点の停止方法を深く追うほど広域調査の時間を失い、範囲を広げるほど目の前の倉持捜索から離れる。",
    decisionPrompt: "冬城一人の実験を深く追いますか、建物同士の関係へ範囲を広げますか？"
  },''',
"M12": '''  M12: {
    objective: "突然現れ、消え始めている扉を利用するか決める。",
    knownFacts: [
      "数分前まで壁だった場所に、図面にない木製扉が現れている。",
      "扉の向こうには、現在の雨声荘とは配置の異なる廊下が見える。",
      "扉の輪郭はすでに薄くなり始めており、長く残らない。"
    ],
    stakes: "今すぐ入る、道具だけ送る、現象を記録する、無視するという対応ができる。原因や再現条件は、取得済みの手掛かりによって分かる範囲が異なる。",
    decisionPrompt: "一時的な機会へ即応しますか、それとも確認や再現性を優先しますか？"
  },''',
"M14": '''  M14: {
    objective: "冬城の停止記録と、観測窓の向こうにいるものをどう扱うか決める。",
    knownFacts: [
      "観測室には、発振器・鏡列・非常電源・曲面処理について書かれた停止手順が残っている。",
      "観測窓の角から青黒い煙が漏れ、その奥で細長い影が角から角へ移動している。",
      "冬城の資料には『HOUNDS OF TINDALOS』と題された紙片があり、角と観測者について短い警告が残されている。"
    ],
    stakes: "古い記録を頼るか、現在の反応を直接確かめるか、窓を隔離して時間を稼ぐかを選べる。",
    decisionPrompt: "冬城の記録と、目の前の未知の反応をどの程度まで確かめますか？",
    glossary: [{ term: "Hounds of Tindalos / ティンダロスの猟犬", definition: "冬城が資料中で用いた名称。少なくとも彼は、角から現れ観測者を追う存在として扱っていた。" }]
  },''',
"S04": '''  S04: {
    objective: "A・B・Cと記された三つの倉持記録が、どのような関係にあるのか確かめる。",
    knownFacts: [
      "A・B・Cの記録はいずれも、倉持が雨声荘へ入り観測器を見つけるところまではよく似ている。",
      "その後の記録内容は一致せず、調査継続、撤退、榊への救援という異なる経過を示す。",
      "記録後半は映像ではなく、観測者が見聞きした感覚を保存する形式になっている。"
    ],
    stakes: "断片だけを比較する、全記録を受け取る、救出手順だけ確認する、記録を閉じるという方法がある。どこまで見なければ関係を確定できないかは、選んだ方法で変わる。",
    decisionPrompt: "三つの記録を、どこまで理解するところまで追いますか？"
  },''',
"M16": '''  M16: {
    objective: "観測室中央の倉持三像と、建物外へ続く回路のどちらを先に扱うか決める。",
    knownFacts: [
      "観測室中央には、位置を少しずつずらした三人の倉持が重なって見える。",
      "三人へ同時に声をかけると返答が干渉し、内容を聞き取れない。",
      "壁内の金属部材と配線は雨声荘の外へ続き、他施設側の異常信号も続いている。"
    ],
    stakes: "倉持へ直接近づく、外へ続く回路を先に扱う、両方を試す、雨声荘だけを再封鎖するという範囲選択がある。",
    decisionPrompt: "この時点で、事件をどの範囲まで引き受けますか？"
  },''',
"L04": '''  L04: {
    objective: "A・B・Cと表示された三つの信号のうち、最初にどれを開くか、その決め方を選ぶ。",
    knownFacts: [
      "制御盤にはA・B・Cの三つの信号窓が表示されている。",
      "三つを同時に開くと音声が干渉し、内容を判別できない。",
      "ここで決めるのは帰還させる倉持ではなく、最初にどの情報へ接触するかだけである。"
    ],
    stakes: "偶然、最も強い信号、自分で行う反応試験、同行者の視点のどれを最初の選択基準にするかを決める。",
    decisionPrompt: "中身を知る前に、最初の情報源をどの基準で選びますか？"
  },'''
}

order = [
    ("M01", "M06"), ("M02", "L02"), ("M05", "M09"),
    ("M11", "M04"), ("L03", "M07"), ("M07", "M10"),
    ("M10", "S01"), ("S01", "M08"), ("M08", "M12"),
    ("M12", "L01"), ("M14", "S04"), ("S04", "M13"),
    ("M16", "L04"), ("L04", "S03")
]
for slot, next_slot in order:
    guides = replace_block(guides, slot, next_slot, blocks[slot])

guides_path.write_text(guides, encoding="utf-8")

# --- Read-aloud: introduce formal terms only when earned -------------------------
read_path = Path("src/core/readAloud.ts")
read = read_path.read_text(encoding="utf-8")

read = read.replace(
    '観測室の手前に、厚い特殊ガラスで塞がれた小窓がある。\n\nその向こうに見えているのは、一つの部屋ではない。',
    '観測室の手前に、厚い特殊ガラスで塞がれた小窓がある。\n\n窓の脇には、古びた真鍮の銘板が残っている。\n\n《時角干渉観測器　補助観測窓》\n\n「時角」という語の意味を示す説明は、銘板の周囲にはない。\n\nその向こうに見えているのは、一つの部屋ではない。',
    1
)

m14_marker = '順番まで細かく指定されている。\n\n一方、観測窓の向こうでは青黒い煙がゆっくり渦を巻いている。'
m14_replacement = '''順番まで細かく指定されている。\n\n手順書の下から、薄い紙片が一枚滑り落ちる。\n\n上部には英字で《HOUNDS OF TINDALOS》とある。\n\nその下には冬城の筆跡で、三行だけ日本語が残されていた。\n\n「角から来る」\n\n「観測した者を追う」\n\n「曲面では出現点を作りにくい。ただし追跡が消えたとは考えるな」\n\n一方、観測窓の向こうでは青黒い煙がゆっくり渦を巻いている。'''
if m14_marker not in read:
    raise SystemExit("M14 insertion point not found")
read = read.replace(m14_marker, m14_replacement, 1)

s04 = '''  S04: `観測器の記録装置には、倉持の名前とともに三つの記録番号が並んでいる。\n\nA。\n\nB。\n\nC。\n\n再生すると、冒頭の映像はよく似ている。\n\n倉持が雨声荘へ入る。地下へ降りる。観測器を見つける。\n\nだが、ある時点から三つの記録は違う内容を示し始めた。\n\nAでは、倉持は調査を続けている。\n\nBでは、異常に気づいて建物から逃げようとしている。\n\nCでは、榊へ何度も救援を送っている。\n\n記録の前半に映る傷、服、所持品には、見分けられるほどの差がない。\n\n装置の表示にも、「原本」「複製」といった区別は見当たらない。\n\n後半の記録は映像ではない。\n\n観測者が見たもの、聞いたもの、身体で受けた感覚までを保存する形式へ切り替わっている。\n\n再生装置には、全記録、断片再生、救出手順のみ、の三つの読み出し方法が残されている。`,'''
read = replace_narration(read, "S04", "M13", s04)

m16 = '''  M16: `観測室の中央へ目を向ける。\n\nそこには、三人の倉持がいる。\n\n完全に別々の場所へ立っているわけではない。\n\n同じ位置から数十センチずつずれながら、三人が互いをすり抜けるように動いている。\n\n声をかけると、三人とも同時にこちらを向いた。\n\n返事も同時に返る。\n\n言葉が重なり、内容までは聞き取れない。\n\n壁の中では、金属角材が低く振動している。\n\nその振動は、雨声荘の外へ伸びる配線を通じて、残り三施設の方向へ続いている。\n\n三人へ直接触れるには、像が重なっている中心へ入る必要がある。\n\n外へ続く回路も、今なお動いている。\n\n観測室の時計が一度だけ音を立てた。`,'''
read = replace_narration(read, "M16", "L04", m16)

l04 = '''  L04: `制御盤に、三つの信号窓が並んでいる。\n\n《A》\n\n《B》\n\n《C》\n\nそれぞれの窓の向こうに、倉持の輪郭が一つずつ見える。\n\n三つを同時に開く。\n\n声が重なった。\n\n波形も互いに干渉し、何を言っているのか判別できない。\n\n一つだけに絞れば、情報を取り出せるらしい。\n\nただし、窓を開く前の表示からは、A・B・Cがそれぞれ何を知っているのかまでは分からない。\n\n制御盤は三つの信号を点滅させたまま、入力を待っている。`,'''
read = replace_narration(read, "L04", "S03", l04)

read = read.replace(
    '腕時計の針は進んでいる。午前3時17分までの猶予も、同じように減っている。',
    '腕時計の針は進んでいる。ここに留まっているあいだにも、地下から響く振動は少しずつ強くなっている。',
    1
)
read = read.replace(
    '時計を見る。\n\n午前3時17分が近い。\n\n発振器が、もう一度鳴った。',
    '非常電源設備の表示灯が、一度だけ明滅する。\n\n発振器が、もう一度鳴った。',
    1
)
read_path.write_text(read, encoding="utf-8")

# --- Visible choice/outcome wording: do not name a theory before it is established ---
scenes_path = Path("src/core/scenes.ts")
scenes = scenes_path.read_text(encoding="utf-8")
replacements = {
    'label: "時間角へ直接接続し、倉持の別未来をすべて体験する"': 'label: "観測器へ直接接続し、倉持の別の記録をすべて体験する"',
    'outcome: "時間角の存在は確認したが、体験を自分の記憶として受け取ることは避けた。"': 'outcome: "複数の像が単なる同一映像の重なりではないことは確認したが、その体験を自分の記憶として受け取ることは避けた。"',
    'outcome: "映像は消えた。真相へは近づかなかったが、いくつかの時間状態を観測不能へ戻した。破損した縁には新しい角が残る。"': 'outcome: "映像は消えた。真相へは近づかなかったが、いくつかの像は観測不能になった。破損した縁には新しい角が残る。"',
    'outcome: "起こらなかった雨声荘へ一時的に踏み込んだ。近道を得たが、時間角への曝露が深くなる。"': 'outcome: "現在とは配置の異なる雨声荘へ一時的に踏み込んだ。近道を得たが、異常な現象への接触は深くなる。"',
    'label: "時間角へ入り、倉持の時間状態へ接触する"': 'label: "三人の倉持が重なる中心へ入り、直接接触する"',
    'outcome: "倉持の救出を優先して時間角へ踏み込んだ。三状態との接触は容易になったが、猟犬にも個人として感知される。"': 'outcome: "倉持の救出を優先して三つの像が重なる中心へ踏み込んだ。三人との接触は容易になったが、角の向こうの存在にも個人として感知される。"',
    'body: "観測室には三つの時間角が開き、それぞれ倉持A・B・Cの情報へつながっている。ここで帰還者は決めない。限られた時間の中で、どの情報を最初に回収するかを決める。"': 'body: "観測室の制御盤にはA・B・Cの三つの信号窓が開いている。ここで帰還者は決めない。限られた時間の中で、どの情報を最初に回収するかを決める。"',
    'label: "ダイスで一つの時間角を選び、最初の情報源にする"': 'label: "ダイスで一つの信号窓を選び、最初の情報源にする"',
    'label: "最も強く反応する時間角を、自分の判断でこじ開ける"': 'label: "最も強く反応する信号窓を、自分の判断で開く"',
    'outcome: "最も強い信号へ直接介入し、倉持Aの観測記録を最初に回収した。角の安定性は低下する。"': 'outcome: "最も強い信号へ直接介入し、倉持Aの観測記録を最初に回収した。装置の安定性は低下する。"',
    'label: "一度だけ反応試験を行い、その結果を基に時間角を開く"': 'label: "一度だけ反応試験を行い、その結果を基に信号窓を開く"'
}
for old, new in replacements.items():
    if old not in scenes:
        raise SystemExit(f"visible wording marker missing: {old[:60]}")
    scenes = scenes.replace(old, new, 1)
scenes_path.write_text(scenes, encoding="utf-8")

# --- Version/report --------------------------------------------------------------
for file_name in ("package.json", "public/site-config.js"):
    path = Path(file_name)
    text = path.read_text(encoding="utf-8")
    changed = text.replace("1.5.0-beta.1", "1.6.0-beta.1")
    if changed == text:
        raise SystemExit(f"version marker missing in {file_name}")
    path.write_text(changed, encoding="utf-8")

Path("reports/revision-v1.6.md").write_text(
    """# 情報開示順監査 v1.6\n\n"
    "Scene 1→24を、読み上げ本文・確認情報・選択肢・選択後結果まで通読し、PCが未取得の真相をUIが先回りしないよう修正した。\n\n"
    "## 主な変更\n"
    "- Scene 4では曲面改修の用途と効果を説明せず、観察事実だけを提示。\n"
    "- 『時角干渉観測器』という正式名称はScene 13で銘板から初出。意味はその時点では未確定。\n"
    "- Tindalosの名称はScene 18で冬城資料から明示し、冬城の仮説として提示。\n"
    "- A/B/Cが一人の倉持から分岐した関係の確証はScene 19の調査結果へ寄せる。\n"
    "- L04では接触前にA/B/Cの役割を開示しない。\n"
    "- M16の共通本文もA/B/Cの役割を知らないルートで成立する中立描写へ変更。\n"
    "- 古図面、曲面の効果、四棟地図などはAppStateで取得済みの場合だけ『確認できること』へ追加。\n"
    "- 03:17という exact deadline を共通読み上げ・ガイドから除外。特定調査で時刻を得た場合だけ結果として残す。\n"
    "- 採点・状態遷移・Endingロジックは変更なし。\n"
    """,
    encoding="utf-8"
)

print("v1.6 information-order patch applied")

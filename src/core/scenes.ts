import type {
  ChoiceDefinition,
  Condition,
  DiagnosticWeights,
  KuramochiVariantId,
  MeasurementSlotId,
  NumericStatePath,
  ScalarStatePath,
  CollectionStatePath,
  SceneDefinition,
  StateEffect,
  UnscoredFollowUp
} from "./types.js";

const inc = (path: NumericStatePath, value: number): StateEffect => ({ op: "inc", path, value });
const set = (path: ScalarStatePath, value: unknown): StateEffect => ({ op: "set", path, value });
const add = (path: CollectionStatePath, value: string): StateEffect => ({ op: "add", path, value });
const reveal = (variant: KuramochiVariantId): StateEffect => ({ op: "revealKuramochi", variant });
const contact = (variant: KuramochiVariantId): StateEffect => ({ op: "contactKuramochi", variant });
const fix = (variant: KuramochiVariantId): StateEffect => ({ op: "fixKuramochi", variant });
const selectInfo = (strategy: "random" | "strongest" | "probe" | "companion"): StateEffect => ({
  op: "selectKuramochiInfo",
  strategy
});

const weights = (value: DiagnosticWeights): DiagnosticWeights => value;
const condition = (value: Condition): Condition => value;
const choice = (value: ChoiceDefinition): ChoiceDefinition => value;

const fixationFollowUp: UnscoredFollowUp = {
  id: "choose_kuramochi_variant",
  prompt: "現実へ固定する時間状態を選んでください。この選択自体は能力値の採点には使われません。",
  options: [
    {
      id: "fix_a",
      label: "倉持A――観測を続け、真相を最も多く知る倉持",
      effects: [fix("A")]
    },
    {
      id: "fix_b",
      label: "倉持B――撤退を試み、身体状態が最も安定した倉持",
      effects: [fix("B")]
    },
    {
      id: "fix_c",
      label: "倉持C――榊へ救援を求め、関係記憶を最も多く残す倉持",
      effects: [fix("C")]
    }
  ]
};

export const SCENES: readonly SceneDefinition[] = [
  {
    slotId: "M03",
    act: 1,
    title: "消去される送信データ",
    primaryAxes: ["DEX", "EDU"],
    ui: "allocation",
    body: "管理会社の一時サーバーに、失踪した倉持直人から届いた音声が残っている。保管期限は切れており、次の自動処理で上書きされる。画面上の音声だけなら今すぐ複製できるが、送信元・編集履歴・時刻同期を含む正式ログの取得には手続きが必要だ。",
    constraint: "現地へ向かうまでに確保できる作業時間は限られている。",
    choices: [
      choice({
        id: "M03_quick_copy",
        label: "画面に残っている音声を、今すぐそのまま複製する",
        detail: "完全な監査情報は失うが、消える前に内容を確保する。",
        outcome: "音声は保存できた。波形の奥に、通常音声から十七分ずれた第二音声が見つかる。",
        diagnosticWeights: weights({ DEX: 1, EDU: -0.75 }),
        effects: [
          add("story.clues", "quick_audio_copy"),
          add("story.clues", "phase_waveform"),
          add("story.inventory", "audio_copy"),
          set("observer.observerLink", "reference_linked")
        ],
        salience: 2
      }),
      choice({
        id: "M03_formal_log",
        label: "管理者へ正式な監査ログの保全を依頼する",
        detail: "現地到着は遅れるが、時刻同期や送信経路を含む記録を確保する。",
        outcome: "正式ログが届く。サーバー時計は正常で、第二音声だけが送信時刻より十七分後に作成されていた。",
        diagnosticWeights: weights({ DEX: -0.75, EDU: 1 }),
        effects: [
          inc("story.timeUnits", -1),
          add("story.clues", "formal_server_log"),
          add("story.clues", "phase_waveform"),
          add("story.clues", "emergency_power_log"),
          add("story.inventory", "formal_log"),
          set("observer.observerLink", "reference_linked")
        ],
        salience: 2
      }),
      choice({
        id: "M03_parallel",
        label: "画面録画をしながら、同時に正式保全を申請する",
        detail: "両方を確保する代わりに、作業が分散して出発が遅れる。",
        outcome: "音声と最低限のログを両方確保した。第二音声の位相差も確認できるが、正式ログの一部は欠けている。",
        diagnosticWeights: weights({ DEX: 0.5, EDU: 0.5 }),
        effects: [
          inc("story.timeUnits", -1),
          add("story.clues", "quick_audio_copy"),
          add("story.clues", "formal_server_log"),
          add("story.clues", "phase_waveform"),
          add("story.inventory", "audio_copy"),
          set("observer.observerLink", "reference_linked")
        ],
        salience: 1
      }),
      choice({
        id: "M03_colleague",
        label: "倉持の同僚へ連絡し、送信前後の状況を確認する",
        detail: "技術情報より、倉持が何を見て何を恐れていたかを先に確かめる。",
        outcome: "同僚が受け取っていた予備録音を提供した。そこにも十七分先の第二音声が含まれている。",
        diagnosticWeights: weights({ DEX: -0.25, EDU: -0.25, APP: 0.5 }),
        effects: [
          inc("story.trust.sakaki", 1),
          add("story.clues", "quick_audio_copy"),
          add("story.clues", "phase_waveform"),
          add("story.inventory", "audio_copy"),
          set("observer.observerLink", "reference_linked"),
          add("story.flags", "heard_kuramochi_context")
        ],
        salience: 1
      })
    ],
    variants: [],
    recordUnchosenAct: 1
  },
  {
    slotId: "M01",
    act: 1,
    title: "二重に記録された声",
    primaryAxes: ["APP", "INT"],
    ui: "cards",
    body: "分離した第二音声には、管理会社の担当者・榊亜希しか知らないはずの私的な言葉が含まれている。同時に、波形は一つの声が二重になったのではなく、異なる時刻の二音声が重なった構造を示している。",
    constraint: "榊本人へ踏み込むか、現象の構造へ踏み込むか。どちらにも別の危険がある。",
    choices: [
      choice({
        id: "M01_ask_sakaki",
        label: "榊に、その言葉の意味と倉持との関係を尋ねる",
        detail: "音声を人間の記憶として確かめる。",
        outcome: "その言葉は倉持が事故の前日にだけ使ったものだった。榊は、録音の倉持が自分へ助けを求めていると確信する。",
        diagnosticWeights: weights({ APP: 1, INT: -0.75 }),
        effects: [
          inc("story.trust.sakaki", 1),
          add("story.clues", "sakaki_private_phrase"),
          add("story.clues", "kuramochi_sakaki_memory")
        ],
        salience: 2
      }),
      choice({
        id: "M01_analyze_phase",
        label: "波形・時刻情報・ノイズ構造を解析する",
        detail: "榊の感情から距離を取り、第二音声が成立した条件を調べる。",
        outcome: "第二音声は常に十七分だけ位相が先行している。単なる編集や時計の誤差では説明できない。",
        diagnosticWeights: weights({ APP: -0.75, INT: 1 }),
        effects: [
          add("story.clues", "phase_waveform"),
          add("story.flags", "phase_cycle_understood")
        ],
        salience: 2
      }),
      choice({
        id: "M01_joint_review",
        label: "榊と一緒に音声を確認し、反応と波形を照合する",
        detail: "人間の記憶と技術的な異常を同時に扱う。",
        outcome: "私的な言葉と十七分の位相差を両方確認できた。ただし榊も分離音声を意識して聞き、観測器との弱いリンクを持つ。",
        diagnosticWeights: weights({ APP: 0.5, INT: 0.5 }),
        effects: [
          inc("story.timeUnits", -1),
          inc("story.trust.sakaki", 1),
          add("story.clues", "sakaki_private_phrase"),
          add("story.flags", "phase_cycle_understood"),
          set("observer.sakakiLinked", true),
          inc("mythos.houndPressure", 1)
        ],
        salience: 1
      }),
      choice({
        id: "M01_preserve_only",
        label: "今は断定せず、未加工データとして現地へ持ち込む",
        detail: "判断を保留し、雨声荘で起きている現象との照合を優先する。",
        outcome: "音声を保全したまま調査方針を維持した。榊は結論を急がず、現地からの報告を待つ。",
        diagnosticWeights: weights({ APP: -0.25, INT: -0.25, CON: 0.5 }),
        effects: [add("story.flags", "audio_preserved_uninterpreted")],
        salience: 1
      })
    ],
    variants: [],
    recordUnchosenAct: 1
  },
  {
    slotId: "M06",
    act: 1,
    title: "一人の証言か、四棟の構造か",
    primaryAxes: ["APP", "SIZ"],
    ui: "map",
    body: "雨声荘へ向かう前に、追加で一つの調査へ時間を使える。最後の元住人・須藤澄江は今夜なら話せる。一方、冬城宗一郎が改修した建物は雨声荘以外にも三棟あり、配置を調べれば事件の規模が変わるかもしれない。大学には冬城の設計記録も残っている。",
    constraint: "すべてを調べる時間はない。",
    choices: [
      choice({
        id: "M06_sumie",
        label: "元住人の須藤澄江を訪ねる",
        detail: "一人の生活と記憶を深く聞き、建物で何が起きていたかを知る。",
        outcome: "澄江は、冬城が夜中に建物の角を漆喰で埋めていたと証言する。彼女は雨声荘まで同行する。",
        diagnosticWeights: weights({ APP: 1, SIZ: -0.75 }),
        effects: [
          inc("story.timeUnits", -1),
          set("story.routes.lead", "sumie"),
          set("story.companion", "sumie_present"),
          inc("story.trust.sumie", 2),
          add("story.clues", "sumie_corner_testimony")
        ],
        salience: 3
      }),
      choice({
        id: "M06_network",
        label: "冬城が改修した他三施設の位置と配置を調べる",
        detail: "一棟の怪事件ではなく、都市規模の構造として捉える。",
        outcome: "四棟は地図上で巨大な角度図形を作っている。雨声荘はその主観測点らしい。",
        diagnosticWeights: weights({ APP: -0.75, SIZ: 1 }),
        effects: [
          inc("story.timeUnits", -1),
          set("story.routes.lead", "network"),
          set("observer.angleNetworkState", "suspected"),
          add("story.clues", "facility_locations"),
          add("story.clues", "orientation_distances"),
          add("story.clues", "giant_angle_map")
        ],
        salience: 3
      }),
      choice({
        id: "M06_records",
        label: "大学に残る冬城の改修記録を調べる",
        detail: "人物や広域配置より、装置と建築の来歴を確認する。",
        outcome: "雨声荘には、図面上存在しない観測室と卵殻型避難室が造られていた。",
        diagnosticWeights: weights({ APP: -0.25, SIZ: -0.25, EDU: 0.5 }),
        effects: [
          inc("story.timeUnits", -1),
          set("story.routes.lead", "records"),
          add("story.clues", "old_floor_plan"),
          add("story.clues", "plaster_record"),
          add("story.clues", "eggshell_shelter"),
          add("story.inventory", "old_blueprint")
        ],
        salience: 2
      }),
      choice({
        id: "M06_immediate",
        label: "追加調査をせず、倉持の救出を優先して直ちに向かう",
        detail: "情報を捨てる代わりに、現地で使える時間を確保する。",
        outcome: "雨声荘へ早く到着した。入口には、まだ乾いていない倉持の足跡が残っている。",
        diagnosticWeights: weights({ APP: -0.25, SIZ: -0.25, DEX: 0.5 }),
        effects: [
          inc("story.timeUnits", 1),
          set("story.routes.lead", "immediate"),
          add("story.flags", "early_arrival"),
          add("story.clues", "kuramochi_injury_continuity")
        ],
        salience: 2
      })
    ],
    variants: [],
    recordUnchosenAct: 1
  },
  {
    slotId: "M02",
    act: 1,
    title: "封鎖された入口",
    primaryAxes: ["CON", "STR"],
    ui: "cards",
    body: "雨声荘の正面入口は、厚い漆喰と曲面パネルで卵殻のように覆われている。解体業者が一部を剥がした跡から、建物内部の角が露出している。中からは、倉持らしき声と、何かを引きずる音が聞こえる。",
    constraint: "封鎖を保全すれば侵入は遅れる。直接開けば倉持へ近づけるが、角も増える。",
    choices: [
      choice({
        id: "M02_preserve",
        label: "曲面封鎖を保全し、別の安全な入口を探す",
        outcome: "封鎖の形を崩さず、保守用の円形ハッチを見つけた。侵入は遅れたが、曲面構造が異常を弱めることも確認できた。",
        diagnosticWeights: weights({ CON: 1, STR: -0.75 }),
        effects: [
          inc("story.timeUnits", -1),
          inc("story.roundedSafety", 2),
          set("story.routes.entry", "preserve"),
          add("story.clues", "normalized_clock_in_curve"),
          add("story.clues", "eggshell_shelter"),
          set("story.location", "rounded_service_hatch")
        ],
        salience: 2
      }),
      choice({
        id: "M02_force",
        label: "工具で封鎖壁を直接開き、声のする側へ入る",
        outcome: "入口は開いた。だが砕けた漆喰の奥に直角の金属枠が露出し、その角から青黒い煙が一筋漏れる。",
        diagnosticWeights: weights({ CON: -0.75, STR: 1 }),
        effects: [
          inc("story.structuralDamage", 1),
          inc("story.cornerBreaches", 1),
          inc("mythos.houndPressure", 1),
          set("story.routes.entry", "force"),
          add("story.clues", "corner_smoke"),
          set("story.location", "front_corridor")
        ],
        salience: 3
      }),
      choice({
        id: "M02_limited",
        label: "封鎖を補強しながら、人一人分だけ開口する",
        outcome: "曲面パネルを支えに使い、最小限の開口を作った。時間と資材を使ったが、露出する角を抑えられた。",
        diagnosticWeights: weights({ CON: 0.5, STR: 0.5 }),
        effects: [
          inc("story.timeUnits", -1),
          inc("story.roundedSafety", 1),
          set("story.routes.entry", "limited"),
          add("story.inventory", "curved_panel_fragment"),
          set("story.location", "front_corridor")
        ],
        salience: 1
      }),
      choice({
        id: "M02_call",
        label: "外から倉持の声へ呼びかけ、反応を確かめる",
        outcome: "声は回答した。しかし同じ返事が、建物内の複数の角から少しずつ遅れて繰り返される。建物側にもこちらの声を知られた。",
        diagnosticWeights: weights({ CON: -0.25, STR: -0.25, POW: 0.5 }),
        effects: [
          inc("mythos.houndPressure", 1),
          set("story.routes.entry", "call"),
          add("story.flags", "building_learned_voice"),
          set("story.location", "front_corridor")
        ],
        salience: 2
      })
    ],
    variants: [
      {
        id: "M02_after_sumie",
        conditions: [condition({ type: "route", route: "lead", value: "sumie" })],
        priority: 10,
        bodyPrefix: "澄江は入口を見るなり、『冬城先生が最後に丸くした場所です』と立ち止まる。"
      },
      {
        id: "M02_after_records",
        conditions: [condition({ type: "route", route: "lead", value: "records" })],
        priority: 10,
        bodyPrefix: "改修記録では、この入口は避難室へ続く円形ハッチとして描かれている。"
      },
      {
        id: "M02_after_network",
        conditions: [condition({ type: "route", route: "lead", value: "network" })],
        priority: 10,
        bodyPrefix: "露出した金属枠の方向は、他三施設へ伸びる地図上の線と一致している。"
      },
      {
        id: "M02_early_arrival",
        conditions: [condition({ type: "route", route: "lead", value: "immediate" })],
        priority: 10,
        bodyPrefix: "濡れた足跡は封鎖の隙間から中へ続き、まだ新しい。"
      }
    ],
    recordUnchosenAct: 1
  },
  {
    slotId: "L02",
    act: 1,
    title: "鍵のかかった管理室",
    primaryAxes: ["LUCK", "INT"],
    ui: "dice",
    body: "建物の電源・改修図面・非常設備を管理していた部屋は施錠されている。今すぐ開錠を試みるなら成功率は45％。周囲の行動記録を調べれば鍵の所在を絞り込めるが、午前3時17分までの時間を消費する。",
    choices: [
      choice({
        id: "L02_roll_now",
        label: "成功率45％で、今すぐ開錠を試みる",
        outcome: "ダイスの結果に従い、管理室への入り方が決まった。選んだのは不確実性そのものだ。",
        diagnosticWeights: weights({ LUCK: 1, INT: -0.75 }),
        effects: [add("story.flags", "attempted_management_lock")],
        usesDice: true,
        diceThreshold: 45,
        diceEffects: {
          success: [
            add("story.clues", "old_floor_plan"),
            add("story.clues", "emergency_power_log"),
            add("story.inventory", "old_blueprint")
          ],
          failure: [
            inc("story.timeUnits", -1),
            inc("story.structuralDamage", 1),
            add("story.flags", "management_lock_damaged")
          ]
        },
        salience: 2
      }),
      choice({
        id: "L02_infer_key",
        label: "冬城と管理人の行動記録から、鍵の保管場所を推理する",
        outcome: "古い点検記録と現在の棚配置を照合し、非常用鍵を見つけた。",
        diagnosticWeights: weights({ LUCK: -0.75, INT: 1 }),
        effects: [
          inc("story.timeUnits", -1),
          add("story.clues", "old_floor_plan"),
          add("story.clues", "emergency_power_log"),
          add("story.inventory", "old_blueprint")
        ],
        salience: 2
      }),
      choice({
        id: "L02_partial_then_roll",
        label: "最低限の手掛かりだけ確認し、成功率65％で判定する",
        outcome: "情報で確率を上げたうえで、最後はダイスへ委ねた。",
        diagnosticWeights: weights({ LUCK: 0.5, INT: 0.5 }),
        effects: [inc("story.timeUnits", -1)],
        usesDice: true,
        diceThreshold: 65,
        diceEffects: {
          success: [
            add("story.clues", "old_floor_plan"),
            add("story.clues", "emergency_power_log"),
            add("story.inventory", "old_blueprint")
          ],
          failure: [add("story.flags", "management_room_unopened")]
        },
        salience: 1
      }),
      choice({
        id: "L02_alternate",
        label: "管理室を諦め、配電盤と現場寸法から必要情報を集める",
        outcome: "図面は得られなかったが、非常電源の負荷試験時刻と建物の外寸を確認できた。",
        diagnosticWeights: weights({ LUCK: -0.25, INT: -0.25, CON: 0.5 }),
        effects: [
          inc("story.timeUnits", -1),
          add("story.clues", "emergency_power_log"),
          add("story.clues", "hidden_room_measurement")
        ],
        salience: 1
      })
    ],
    variants: []
  },
  {
    slotId: "M05",
    act: 2,
    title: "図面にない空間",
    primaryAxes: ["EDU", "INT"],
    ui: "evidence",
    body: "雨声荘の外寸と、確認できる室内の寸法が一致しない。二階北側の壁の内側に、幅二メートルほどの空間が存在するはずだ。古い改修資料を追うことも、現場の音・温度・距離から構造を組み立てることもできる。",
    choices: [
      choice({
        id: "M05_records",
        label: "過去の改修記録と建築資料を追う",
        outcome: "冬城が『音響測定室』として申請し、後に図面から削除した部屋を確認した。",
        diagnosticWeights: weights({ EDU: 1, INT: -0.75 }),
        effects: [
          inc("story.timeUnits", -1),
          add("story.clues", "old_floor_plan"),
          add("story.clues", "plaster_record"),
          add("story.clues", "oscillator_map")
        ],
        salience: 2
      }),
      choice({
        id: "M05_infer",
        label: "壁の長さ、反響、温度差から空間を推定する",
        outcome: "資料を使わず、現場証拠から壁内空間の形と入口候補を絞り込んだ。",
        diagnosticWeights: weights({ EDU: -0.75, INT: 1 }),
        effects: [
          add("story.clues", "hidden_room_measurement"),
          add("story.flags", "inferred_hidden_room")
        ],
        salience: 2
      }),
      choice({
        id: "M05_overlay",
        label: "古い図面へ現在の測定値を重ねる",
        outcome: "過去資料と現場測定が一致し、図面にない部屋の輪郭が明確になった。",
        diagnosticWeights: weights({ EDU: 0.5, INT: 0.5 }),
        effects: [
          inc("story.timeUnits", -1),
          add("story.clues", "old_floor_plan"),
          add("story.clues", "hidden_room_measurement")
        ],
        salience: 1
      }),
      choice({
        id: "M05_tap_walls",
        label: "壁を順番に叩き、反応の差から入口を探す",
        outcome: "体系的な資料や仮説より先に、音の違う壁面を実地で見つけた。",
        diagnosticWeights: weights({ EDU: -0.25, INT: -0.25, DEX: 0.5 }),
        effects: [add("story.flags", "wall_response_mapped")],
        salience: 1
      })
    ],
    variants: [
      {
        id: "M05_with_blueprint",
        conditions: [condition({ type: "clue", value: "old_floor_plan" })],
        priority: 10,
        bodyPrefix: "手元の図面には、現在の壁の内側へ向かう配線だけが途中で切れている。"
      },
      {
        id: "M05_without_blueprint",
        conditions: [condition({ type: "clue", value: "old_floor_plan", present: false })],
        priority: 1,
        bodyPrefix: "正式な図面はない。現場そのものを読む必要がある。"
      }
    ],
    recordUnchosenAct: 2
  },
  {
    slotId: "M09",
    act: 2,
    title: "壁の向こうの倉持",
    primaryAxes: ["APP", "STR"],
    ui: "dialogue",
    body: "推定した空間の壁越しに、倉持が助けを求めている。声は榊の名を呼び、第二音声にあった私的な言葉も口にする。しかし、壁を測ると声の位置が数秒ごとにずれている。",
    constraint: "声の主を確認する時間と、壁へ直接介入する時間は同時には取れない。",
    choices: [
      choice({
        id: "M09_talk",
        label: "声の主と会話し、記憶・位置・状態を確認する",
        outcome: "倉持しか知らない情報を得た。ただし会話の終わりには、別の角からこちらの声が復唱され始める。",
        diagnosticWeights: weights({ APP: 1, STR: -0.75 }),
        effects: [
          add("story.clues", "kuramochi_audio_match"),
          add("story.clues", "kuramochi_pre_observation_memory"),
          inc("mythos.houndPressure", 1),
          add("story.flags", "time_echo_learned_voice")
        ],
        salience: 2
      }),
      choice({
        id: "M09_break_wall",
        label: "声の最も近い位置を割り出し、壁を直接開ける",
        outcome: "壁の向こうに人間はおらず、倉持の録音機と血の付いた工具だけが見つかった。",
        diagnosticWeights: weights({ APP: -0.75, STR: 1 }),
        effects: [
          inc("story.structuralDamage", 1),
          inc("story.cornerBreaches", 1),
          add("story.inventory", "recorder"),
          add("story.clues", "kuramochi_personal_item"),
          add("story.clues", "kuramochi_injury_continuity")
        ],
        salience: 3
      }),
      choice({
        id: "M09_signal_then_open",
        label: "声に合図を返させ、安全な位置を確かめてから開ける",
        outcome: "声と壁の位置が一致しないことを確かめたうえで、録音機だけを回収した。時間は失ったが、声そのものが移動していると分かる。",
        diagnosticWeights: weights({ APP: 0.5, STR: 0.5 }),
        effects: [
          inc("story.timeUnits", -1),
          add("story.inventory", "recorder"),
          add("story.clues", "kuramochi_audio_match"),
          add("story.flags", "voice_location_mismatch")
        ],
        salience: 1
      }),
      choice({
        id: "M09_disable_local_system",
        label: "配線と配管を止め、声を出している仕組みから切り離す",
        outcome: "この壁の声は止まったが、同じ声が一階下から再生された。装置の発振系統だけは特定できた。",
        diagnosticWeights: weights({ APP: -0.25, STR: -0.25, INT: 0.5 }),
        effects: [
          inc("story.timeUnits", -1),
          add("story.clues", "oscillator_map"),
          add("story.flags", "local_speaker_disabled")
        ],
        salience: 1
      })
    ],
    variants: [],
    recordUnchosenAct: 2
  },
  {
    slotId: "M11",
    act: 2,
    title: "角から聞こえる声",
    primaryAxes: ["APP", "CON"],
    ui: "order",
    body: "角の奥から、同行者または通信相手にとって大切な人物の声が聞こえる。声は、本人が過去に言えなかった言葉を正確に再生している。相手は動揺し、調査を続けられない。",
    constraint: "人への対応を優先すれば時間を失う。調査を優先すれば関係と安全が揺らぐ。",
    choices: [
      choice({
        id: "M11_stop_and_support",
        label: "調査を止め、相手が落ち着くまで対応する",
        outcome: "相手は呼吸を整え、声が本人ではないと受け入れた。時間は減ったが、以後の判断を共有できる。",
        diagnosticWeights: weights({ APP: 1, CON: -0.75 }),
        effects: [
          inc("story.timeUnits", -1),
          inc("story.trust.sakaki", 1),
          inc("story.trust.sumie", 1),
          set("story.companionCondition", "stable")
        ],
        salience: 2
      }),
      choice({
        id: "M11_assign_role",
        label: "明確な役割を渡し、当初の調査を続ける",
        outcome: "感情の整理は後回しになったが、相手は役割へ集中して調査線を維持した。",
        diagnosticWeights: weights({ APP: -0.75, CON: 1 }),
        effects: [
          set("story.companionCondition", "shaken"),
          add("story.flags", "companion_given_role")
        ],
        salience: 2
      }),
      choice({
        id: "M11_brief_support",
        label: "短く声をかけ、落ち着いたところで一緒に調査へ戻る",
        outcome: "完全には落ち着かないまま、相手は調査へ戻った。双方を維持した代わりに残り時間が減る。",
        diagnosticWeights: weights({ APP: 0.5, CON: 0.5 }),
        effects: [
          inc("story.timeUnits", -1),
          inc("story.trust.sakaki", 1),
          inc("story.trust.sumie", 1),
          set("story.companionCondition", "stable")
        ],
        salience: 1
      }),
      choice({
        id: "M11_send_out",
        label: "証拠を預け、相手を曲面空間または建物外へ退避させる",
        outcome: "その場の配置を変えて危険から切り離した。以後は榊との遠隔通信だけが残る。",
        diagnosticWeights: weights({ APP: -0.25, CON: -0.25, DEX: 0.5 }),
        effects: [
          set("story.companion", "sakaki_remote"),
          set("story.companionCondition", "stable"),
          inc("story.roundedSafety", 1),
          add("story.flags", "companion_evacuated")
        ],
        salience: 1
      })
    ],
    variants: [
      {
        id: "M11_sumie_present",
        conditions: [condition({ type: "companion", value: "sumie_present" })],
        priority: 20,
        bodyPrefix: "澄江には、亡くなった家族が雨声荘で最後に言わなかったはずの謝罪が聞こえている。"
      },
      {
        id: "M11_sakaki_remote",
        conditions: [condition({ type: "companion", value: "sakaki_remote" })],
        priority: 10,
        bodyPrefix: "榊の通信機から、倉持が失踪前には送らなかった別の救援要請が流れる。"
      }
    ],
    recordUnchosenAct: 2
  },
  {
    slotId: "M04",
    act: 2,
    title: "鋭角化する廊下",
    primaryAxes: ["DEX", "STR"],
    ui: "map",
    body: "廊下の壁が内側へ折れ、曲面だった通路に新しい角が生まれ始める。完全に閉じる前なら狭い曲線部分を抜けられる。工具で押し広げることも、支柱を作ることもできる。",
    choices: [
      choice({
        id: "M04_slip_through",
        label: "閉じる前に、残った曲線部分を素早く通り抜ける",
        outcome: "一時的な機会を利用して通過した。背後で廊下は鋭角へ折れ、戻る道は狭くなった。",
        diagnosticWeights: weights({ DEX: 1, STR: -0.75 }),
        effects: [
          inc("mythos.houndPressure", 1),
          add("story.flags", "passed_transient_curve")
        ],
        salience: 2
      }),
      choice({
        id: "M04_force_open",
        label: "工具を差し込み、廊下を物理的に押し広げる",
        outcome: "通路を確保したが、固定面の接合部が裂け、いくつもの新しい角が露出した。",
        diagnosticWeights: weights({ DEX: -0.75, STR: 1 }),
        effects: [
          inc("story.structuralDamage", 1),
          inc("story.cornerBreaches", 1),
          inc("mythos.houndPressure", 1)
        ],
        salience: 3
      }),
      choice({
        id: "M04_brace",
        label: "曲面パネルと資材で支柱を作り、形を固定して進む",
        outcome: "資材と時間を使い、角が閉じ切る前に通路を安定させた。",
        diagnosticWeights: weights({ DEX: 0.5, STR: 0.5 }),
        effects: [
          inc("story.timeUnits", -1),
          inc("story.roundedSafety", 1),
          add("story.flags", "corridor_braced")
        ],
        salience: 1
      }),
      choice({
        id: "M04_detour",
        label: "一度戻り、曲面処理された別の経路を探す",
        outcome: "目の前の機会は捨てたが、建物の形が安定している経路を確保した。",
        diagnosticWeights: weights({ DEX: -0.25, STR: -0.25, CON: 0.5 }),
        effects: [
          inc("story.timeUnits", -1),
          inc("story.roundedSafety", 1),
          add("story.flags", "stable_detour_found")
        ],
        salience: 1
      })
    ],
    variants: [
      {
        id: "M04_many_breaches",
        conditions: [condition({ type: "flag", value: "management_lock_damaged" })],
        priority: 10,
        bodyPrefix: "これまでに傷つけた壁面と連動するように、廊下の角が増えていく。"
      }
    ],
    recordUnchosenAct: 2
  },
  {
    slotId: "L03",
    act: 2,
    title: "地下への二つの道",
    primaryAxes: ["LUCK", "CON"],
    ui: "risk",
    body: "地下の旧実験区画へ続く近道は崩落している。青黒い液体と人間ではない痕跡が残るが、成功率40％で短時間に降りられる。遠回りの曲面スロープは安全だが、午前3時17分までの時間を大きく失う。",
    choices: [
      choice({
        id: "L03_shortcut",
        label: "成功率40％の崩落した近道を使う",
        outcome: "危険な経路を選び、結果をダイスへ委ねた。",
        diagnosticWeights: weights({ LUCK: 1, CON: -0.75 }),
        effects: [
          set("story.routes.basement", "shortcut"),
          inc("mythos.houndPressure", 1),
          add("story.clues", "inhuman_tracks")
        ],
        usesDice: true,
        diceThreshold: 40,
        diceEffects: {
          success: [add("story.flags", "shortcut_success")],
          failure: [
            inc("story.timeUnits", -1),
            inc("story.structuralDamage", 1),
            set("story.companionCondition", "injured"),
            add("story.flags", "shortcut_fall")
          ]
        },
        salience: 3
      }),
      choice({
        id: "L03_curved_slope",
        label: "時間をかけて、段差のない曲面スロープを進む",
        outcome: "遠回りしたが、曲面内では時計が正常に動き、角からの気配も弱まった。",
        diagnosticWeights: weights({ LUCK: -0.75, CON: 1 }),
        effects: [
          inc("story.timeUnits", -2),
          inc("story.roundedSafety", 2),
          set("story.routes.basement", "curved_slope"),
          add("story.clues", "safe_exit_route"),
          add("story.clues", "normalized_clock_in_curve")
        ],
        salience: 2
      }),
      choice({
        id: "L03_reinforced",
        label: "ロープと曲面材で近道を補強して降りる",
        outcome: "資材と時間を使い、危険と確実性の間を取った経路を作った。",
        diagnosticWeights: weights({ LUCK: 0.5, CON: 0.5 }),
        effects: [
          inc("story.timeUnits", -1),
          inc("story.roundedSafety", 1),
          set("story.routes.basement", "reinforced"),
          add("story.inventory", "rope"),
          add("story.flags", "reinforced_basement_route")
        ],
        salience: 1
      }),
      choice({
        id: "L03_observe_cycle",
        label: "崩落の周期を観察し、保守通路が開く瞬間を待つ",
        outcome: "即決を避け、建物の変形周期から保守用の曲面経路を見つけた。",
        diagnosticWeights: weights({ LUCK: -0.25, CON: -0.25, INT: 0.5 }),
        effects: [
          inc("story.timeUnits", -1),
          set("story.routes.basement", "maintenance"),
          add("story.clues", "safe_exit_route"),
          add("story.flags", "observed_geometry_cycle")
        ],
        salience: 1
      })
    ],
    variants: [
      {
        id: "L03_knows_curved_safety",
        conditions: [condition({ type: "clue", value: "normalized_clock_in_curve" })],
        priority: 10,
        bodyPrefix: "曲面空間が完全な防御ではなくても、出現を遅らせることは既に確認している。"
      }
    ],
    recordUnchosenAct: 2
  },
  {
    slotId: "M07",
    act: 3,
    title: "自分の未来の声",
    primaryAxes: ["CON", "POW"],
    ui: "cards",
    body: "地下へ降りると、予定していた調査経路とは逆方向から自分自身の声が聞こえる。声は十七分後に起きるはずの出来事を語り、『先にこちらへ来れば倉持を救える』と言う。",
    constraint: "声を追えば計画外の時間角へ接近する。無視すれば、重要な機会を失う可能性がある。",
    choices: [
      choice({
        id: "M07_keep_plan",
        label: "声は記録だけし、予定した調査経路を維持する",
        outcome: "未来の声を判断材料にせず、当初の目的と手順を保った。声は背後からしばらく付いてくる。",
        diagnosticWeights: weights({ CON: 1, POW: -0.75 }),
        effects: [
          set("story.routes.echo", "keep_plan"),
          add("story.flags", "future_voice_ignored")
        ],
        salience: 2
      }),
      choice({
        id: "M07_follow",
        label: "声を追い、予定外の区画へ入る",
        outcome: "自分の声を追って、存在しなかった扉の向こうへ入った。時間角への接続が深くなる。",
        diagnosticWeights: weights({ CON: -0.75, POW: 1 }),
        effects: [
          set("story.routes.echo", "follow"),
          inc("mythos.angularExposure", 1),
          inc("mythos.houndPressure", 1),
          add("story.flags", "followed_future_voice")
        ],
        salience: 3
      }),
      choice({
        id: "M07_limited_follow",
        label: "目印と時間制限を設定し、届く範囲だけ追う",
        outcome: "帰還条件を決めたうえで声へ接近した。完全な逸脱は避けたが、時間を消費した。",
        diagnosticWeights: weights({ CON: 0.5, POW: 0.5 }),
        effects: [
          inc("story.timeUnits", -1),
          set("story.routes.echo", "limited_follow"),
          inc("mythos.angularExposure", 0.5),
          add("story.flags", "limited_future_voice_contact")
        ],
        salience: 1
      }),
      choice({
        id: "M07_seal",
        label: "声のする角を曲面材で封じ、後で確認できるよう記録する",
        outcome: "その場所の声は止まった。しかし数秒後、録音機の内部から同じ声が再生される。",
        diagnosticWeights: weights({ CON: -0.25, POW: -0.25, EDU: 0.5 }),
        effects: [
          inc("story.timeUnits", -1),
          set("story.routes.echo", "seal"),
          inc("story.roundedSafety", 1),
          add("story.flags", "sealed_future_voice")
        ],
        salience: 2
      })
    ],
    variants: [
      {
        id: "M07_deadline_near",
        conditions: [condition({ type: "timeAtMost", value: 3 })],
        priority: 20,
        bodyPrefix: "午前3時17分が近づき、非常電源の予備回路が低く唸り始める。未来の声は、今とほとんど重なっている。"
      }
    ],
    recordUnchosenAct: 3
  },
  {
    slotId: "M10",
    act: 3,
    title: "選ばなかった自分",
    primaryAxes: ["INT", "POW"],
    ui: "dialogue",
    body: "目の前に、これまで自分が選ばなかった行動を取った『別の自分』が現れる。{{UNCHOSEN_ACT1}}。その自分は、こちらを見て『この方が正しかったと思わないか』と問いかける。",
    constraint: "それが映像、装置の模倣、実在する別時間状態のどれかは分からない。",
    choices: [
      choice({
        id: "M10_test",
        label: "本人しか知らない情報と矛盾を質問し、現象を検証する",
        outcome: "別の自分は複数の質問に答えたが、一部ではこちらの記憶を先回りした。反応規則と限界を記録できた。",
        diagnosticWeights: weights({ INT: 1, POW: -0.75 }),
        effects: [
          add("story.clues", "unchosen_self_testimony"),
          add("story.clues", "observer_reaction_rule"),
          add("story.flags", "alternate_self_tested")
        ],
        salience: 2
      }),
      choice({
        id: "M10_accept_dialogue",
        label: "別の可能性にいる自分として認め、会話を続ける",
        outcome: "説明不能なまま関係を受け入れた。相手は観測室への道を教えるが、こちらの存在も時間角へ深く刻まれる。",
        diagnosticWeights: weights({ INT: -0.75, POW: 1 }),
        effects: [
          inc("mythos.angularExposure", 1),
          inc("mythos.houndPressure", 1),
          add("story.clues", "unchosen_self_testimony"),
          add("story.flags", "alternate_self_accepted")
        ],
        salience: 3
      }),
      choice({
        id: "M10_mixed",
        label: "会話を続けながら、反応を検証できる質問を混ぜる",
        outcome: "別の自分から証言を得つつ、装置の反応も確認した。ただし相手もこちらの情報を学習した。",
        diagnosticWeights: weights({ INT: 0.5, POW: 0.5 }),
        effects: [
          inc("story.timeUnits", -1),
          inc("mythos.houndPressure", 1),
          add("story.clues", "unchosen_self_testimony"),
          add("story.clues", "observer_reaction_rule"),
          add("story.flags", "alternate_self_mutual_learning")
        ],
        salience: 1
      }),
      choice({
        id: "M10_use_route",
        label: "正体は保留し、相手が知る経路だけ利用する",
        outcome: "存在そのものには踏み込まず、別の自分が示す安全な足場と扉の位置だけを使った。",
        diagnosticWeights: weights({ INT: -0.25, POW: -0.25, DEX: 0.5 }),
        effects: [
          add("story.clues", "safe_exit_route"),
          add("story.flags", "alternate_self_route_used")
        ],
        salience: 1
      })
    ],
    variants: [
      {
        id: "M10_followed_voice",
        conditions: [condition({ type: "route", route: "echo", value: "follow" })],
        priority: 20,
        bodyPrefix: "予定外の部屋そのものが重なり、別の自分は物質に近い輪郭を持っている。"
      },
      {
        id: "M10_kept_route",
        conditions: [condition({ type: "route", route: "echo", value: "keep_plan" })],
        priority: 20,
        bodyPrefix: "鏡面にだけ別の自分が映り、こちらと同じ速度で歩いている。"
      },
      {
        id: "M10_limited_contact",
        conditions: [condition({ type: "route", route: "echo", value: "limited_follow" })],
        priority: 20,
        bodyPrefix: "目印の届く範囲だけ、別の空間が現実へ重なっている。"
      },
      {
        id: "M10_sealed_voice",
        conditions: [condition({ type: "route", route: "echo", value: "seal" })],
        priority: 20,
        bodyPrefix: "封じたはずの声が録音機の画面へ移り、そこに別の自分が映っている。"
      }
    ],
    recordUnchosenAct: 3
  },
  {
    slotId: "S01",
    act: 3,
    title: "見なかった未来",
    primaryAxes: ["POW", "SAN_DEPTH"],
    ui: "quadrant",
    body: "時角干渉観測器の補助窓が、倉持に起きた別の未来を映せる状態になっている。防護越しに限定して見ることも、直接接続して全体験を受け入れることもできる。直接観測した人物は、角の向こうにいる何かへ個人として感知される可能性がある。",
    choices: [
      choice({
        id: "S01_remote",
        label: "遠隔カメラと防護窓を使い、内容を限定して観測する",
        outcome: "時間角の存在は確認したが、体験を自分の記憶として受け取ることは避けた。",
        diagnosticWeights: weights({ POW: 0.75, SAN_DEPTH: -0.75 }),
        effects: [
          inc("mythos.angularExposure", 0.5),
          add("story.inventory", "remote_camera"),
          add("story.clues", "hound_name_tindalos"),
          add("story.flags", "limited_time_angle_observation")
        ],
        salience: 2
      }),
      choice({
        id: "S01_direct",
        label: "時間角へ直接接続し、倉持の別未来をすべて体験する",
        outcome: "複数の死と脱出を自分の記憶として体験した。角の奥で何かが振り向き、こちらの時間的な匂いを得る。",
        diagnosticWeights: weights({ POW: 1, SAN_DEPTH: 1 }),
        effects: [
          inc("mythos.angularExposure", 2),
          inc("mythos.houndPressure", 2),
          set("mythos.houndStage", 2),
          add("mythos.markedCharacters", "player"),
          add("story.clues", "hound_name_tindalos"),
          add("story.clues", "blue_ichor_sample")
        ],
        salience: 3
      }),
      choice({
        id: "S01_isolate",
        label: "接続せず、観測窓を曲面材で隔離する",
        outcome: "未知の全容は見ないまま、現在の侵入経路を弱めた。角の向こうの気配は消えない。",
        diagnosticWeights: weights({ POW: -0.75, SAN_DEPTH: -0.75 }),
        effects: [
          inc("story.roundedSafety", 1),
          add("story.flags", "auxiliary_window_isolated")
        ],
        salience: 1
      }),
      choice({
        id: "S01_destroy_record",
        label: "観測記録を破壊し、倉持の別未来が失われることを受け入れる",
        outcome: "映像は消えた。真相へは近づかなかったが、いくつかの時間状態を観測不能へ戻した。破損した縁には新しい角が残る。",
        diagnosticWeights: weights({ POW: -0.75, SAN_DEPTH: 0.75 }),
        effects: [
          inc("observer.lensIntegrity", -10),
          inc("story.structuralDamage", 1),
          inc("story.cornerBreaches", 1),
          add("story.flags", "auxiliary_record_destroyed")
        ],
        salience: 2
      })
    ],
    variants: [
    ],
    recordUnchosenAct: 3
  },
  {
    slotId: "M08",
    act: 3,
    title: "冬城の記録と四棟の回路",
    primaryAxes: ["EDU", "SIZ"],
    ui: "map",
    body: "観測窓の裏から、冬城の実験記録と、別住所が刻まれた金属片が見つかる。冬城一人の実験を深く追えば停止方法へ近づける。四棟の位置と部材を追えば、雨声荘を越えた回路全体が見える。",
    choices: [
      choice({
        id: "M08_deep_records",
        label: "冬城の実験記録と封鎖経緯を深く追う",
        outcome: "鏡を割ったことで侵入口が増えた事故と、装置を止めるための手順を確認した。",
        diagnosticWeights: weights({ EDU: 1, SIZ: -0.75 }),
        effects: [
          inc("story.timeUnits", -1),
          add("story.clues", "fuyushiro_shutdown_notes"),
          add("story.clues", "fuyushiro_disappearance"),
          add("story.clues", "shattered_mirror_log"),
          add("story.clues", "curved_room_limit")
        ],
        salience: 2
      }),
      choice({
        id: "M08_expand_network",
        label: "同じ角材と周波数を持つ施設を市内全体から追う",
        outcome: "四棟が巨大な角度図形を構成し、午前3時17分に同時起動することが分かった。",
        diagnosticWeights: weights({ EDU: -0.75, SIZ: 1 }),
        effects: [
          inc("story.timeUnits", -1),
          set("observer.angleNetworkState", "mapped"),
          add("story.clues", "facility_locations"),
          add("story.clues", "orientation_distances"),
          add("story.clues", "shared_frequency"),
          add("story.clues", "giant_angle_map")
        ],
        salience: 3
      }),
      choice({
        id: "M08_distribution_map",
        label: "製造記録から流通先までを結び、回路図として整理する",
        outcome: "一つの部材の来歴と四棟の配置を統合し、金属角材の向きまで特定した。",
        diagnosticWeights: weights({ EDU: 0.5, SIZ: 0.5 }),
        effects: [
          inc("story.timeUnits", -2),
          set("observer.angleNetworkState", "mapped"),
          add("story.clues", "metal_beam_directions"),
          add("story.clues", "shared_frequency"),
          add("story.clues", "giant_angle_map"),
          add("story.inventory", "metal_tag")
        ],
        salience: 1
      }),
      choice({
        id: "M08_record_and_move",
        label: "現在の建物で必要な情報だけ記録し、倉持の捜索へ戻る",
        outcome: "事件の範囲を拡張せず、現在の目的へ集中した。金属片だけは持ち出した。",
        diagnosticWeights: weights({ EDU: -0.25, SIZ: -0.25, CON: 0.5 }),
        effects: [add("story.inventory", "metal_tag")],
        salience: 1
      })
    ],
    variants: [
      {
        id: "M08_network_known",
        conditions: [condition({ type: "networkState", value: "suspected" })],
        priority: 10,
        bodyPrefix: "事前調査で見つけた四棟の配置と、金属片の住所が一致する。"
      }
    ],
    recordUnchosenAct: 3
  },
  {
    slotId: "M12",
    act: 3,
    title: "一時的に現れた扉",
    primaryAxes: ["CON", "DEX"],
    ui: "map",
    body: "金属片を観測器へ近づけると、壁に数分前にはなかった扉が現れる。扉の向こうには、今の雨声荘とは配置の違う廊下が見える。長くは存在しない。",
    choices: [
      choice({
        id: "M12_ignore",
        label: "扉を無視し、予定した実験区画への経路を進む",
        outcome: "一時的な機会を捨て、当初の調査線を維持した。扉は背後で音もなく消えた。",
        diagnosticWeights: weights({ CON: 1, DEX: -0.75 }),
        effects: [
          set("story.routes.transientDoor", "ignore"),
          add("story.flags", "transient_door_ignored")
        ],
        salience: 2
      }),
      choice({
        id: "M12_enter",
        label: "消える前に扉へ入り、別配置の廊下を進む",
        outcome: "起こらなかった雨声荘へ一時的に踏み込んだ。近道を得たが、時間角への曝露が深くなる。",
        diagnosticWeights: weights({ CON: -0.75, DEX: 1 }),
        effects: [
          set("story.routes.transientDoor", "enter"),
          inc("mythos.angularExposure", 1),
          inc("mythos.houndPressure", 1),
          add("story.flags", "entered_transient_door")
        ],
        salience: 3
      }),
      choice({
        id: "M12_probe",
        label: "目印付きのカメラだけを送り、反応を確認してから進む",
        outcome: "道具を介して別配置を確認した。完全な侵入は避けたが、時間と機材を消費した。",
        diagnosticWeights: weights({ CON: 0.5, DEX: 0.5 }),
        effects: [
          inc("story.timeUnits", -1),
          set("story.routes.transientDoor", "probe"),
          add("story.inventory", "remote_camera"),
          add("story.clues", "temporary_door_cycle")
        ],
        salience: 1
      }),
      choice({
        id: "M12_reproduce",
        label: "扉の出現時刻と角度を記録し、消えた後に再現を試す",
        outcome: "即時の機会は逃したが、扉が十七分周期で再現できることを突き止めた。",
        diagnosticWeights: weights({ CON: -0.25, DEX: -0.25, EDU: 0.5 }),
        effects: [
          inc("story.timeUnits", -1),
          set("story.routes.transientDoor", "reproduce"),
          add("story.clues", "temporary_door_cycle"),
          add("story.flags", "transient_door_reproducible")
        ],
        salience: 1
      })
    ],
    variants: [
      {
        id: "M12_has_metal_tag",
        conditions: [condition({ type: "inventory", value: "metal_tag" })],
        priority: 10,
        bodyPrefix: "別住所が刻まれた金属片が震え、扉の輪郭と同じ周波数で鳴っている。"
      }
    ],
    recordUnchosenAct: 3
  },
  {
    slotId: "L01",
    act: 3,
    title: "形の変わる床",
    primaryAxes: ["LUCK", "DEX"],
    ui: "dice",
    body: "中央実験区画の手前では、床板の安全な位置が数秒ごとに変わる。踏み出す場所を一つ選んでダイスへ委ねることも、家具と曲面材で足場を作ることもできる。",
    choices: [
      choice({
        id: "L01_random_step",
        label: "安全そうな位置を一つ選び、判定に任せて渡る",
        outcome: "床の変化を完全には制御せず、一度の判定へ進行を委ねた。",
        diagnosticWeights: weights({ LUCK: 1, DEX: -0.75 }),
        effects: [add("story.flags", "floor_random_attempt")],
        usesDice: true,
        diceThreshold: 50,
        diceEffects: {
          success: [add("story.flags", "floor_crossed_cleanly")],
          failure: [
            inc("story.timeUnits", -1),
            inc("story.structuralDamage", 1),
            inc("mythos.houndPressure", 1),
            add("story.flags", "floor_shifted_underfoot")
          ]
        },
        salience: 2
      }),
      choice({
        id: "L01_build_footing",
        label: "家具と曲面材を組み替え、連続した足場を作る",
        outcome: "現場の物を組み替えて、偶然に依存しない曲面足場を作った。",
        diagnosticWeights: weights({ LUCK: -0.75, DEX: 1 }),
        effects: [
          inc("story.timeUnits", -1),
          inc("story.roundedSafety", 1),
          add("story.flags", "curved_footing_built")
        ],
        salience: 2
      }),
      choice({
        id: "L01_marker_then_follow",
        label: "目印を投げ、通った位置をすぐ追う",
        outcome: "偶然に安全位置を探させ、その結果へ即応して渡った。",
        diagnosticWeights: weights({ LUCK: 0.5, DEX: 0.5 }),
        effects: [],
        usesDice: true,
        diceThreshold: 70,
        diceEffects: {
          success: [add("story.flags", "marker_route_success")],
          failure: [
            inc("story.timeUnits", -1),
            inc("mythos.houndPressure", 1),
            add("story.flags", "marker_route_shifted")
          ]
        },
        salience: 1
      }),
      choice({
        id: "L01_wait_pattern",
        label: "床の変化を記録し、安全な周期が来るまで待つ",
        outcome: "判定も即興も使わず、床が十七分周期の一部として変化していると突き止めた。",
        diagnosticWeights: weights({ LUCK: -0.25, DEX: -0.25, INT: 0.5 }),
        effects: [
          inc("story.timeUnits", -1),
          add("story.clues", "observer_reaction_rule"),
          add("story.flags", "floor_cycle_understood")
        ],
        salience: 1
      })
    ],
    variants: [
      {
        id: "L01_with_curved_material",
        conditions: [condition({ type: "inventory", value: "curved_panel_fragment" })],
        priority: 10,
        bodyPrefix: "持ち込んだ曲面パネルは、床の角から漏れる気配を一時的に遮れる。"
      }
    ],
    recordUnchosenAct: 3
  },
  {
    slotId: "M15",
    act: 4,
    title: "本当の観測室",
    primaryAxes: ["INT", "STR"],
    ui: "evidence",
    body: "複数の壁から、異なる倉持の声が聞こえる。ここで選ぶのは誰を救うかではない。どの壁の向こうに、時間状態を重ねている本当の観測室があるかを見極める必要がある。",
    constraint: "誤った壁を開けば新しい角と侵入口を作る。推理に時間を使えば午前3時17分へ近づく。",
    choices: [
      choice({
        id: "M15_infer_room",
        label: "音の遅延、温度差、図面を組み合わせて観測室を特定する",
        outcome: "三つの声そのものではなく、反響の起点を追って本当の観測室位置を絞り込んだ。",
        diagnosticWeights: weights({ INT: 1, STR: -0.75 }),
        effects: [
          inc("story.timeUnits", -1),
          add("story.clues", "observation_room_location"),
          add("story.clues", "structural_weak_point"),
          add("story.flags", "observation_room_inferred")
        ],
        salience: 2
      }),
      choice({
        id: "M15_break_strongest",
        label: "最も強く声がする壁を、直ちに開く",
        outcome: "観測室へ到達したが、封鎖壁と金属枠が大きく損傷し、角から青黒い煙が噴き出す。",
        diagnosticWeights: weights({ INT: -0.75, STR: 1 }),
        effects: [
          inc("story.structuralDamage", 2),
          inc("story.cornerBreaches", 1),
          inc("mythos.houndPressure", 2),
          add("story.flags", "observation_room_forced")
        ],
        salience: 3
      }),
      choice({
        id: "M15_test_then_open",
        label: "複数地点を小さく試験し、反応を見てから力を加える",
        outcome: "構造を確かめながら壁を開いた。時間と壁の安定性を失ったが、誤った部屋を開くことは避けた。",
        diagnosticWeights: weights({ INT: 0.5, STR: 0.5 }),
        effects: [
          inc("story.timeUnits", -1),
          inc("story.structuralDamage", 1),
          add("story.clues", "structural_weak_point"),
          add("story.flags", "observation_room_tested")
        ],
        salience: 1
      }),
      choice({
        id: "M15_use_blueprint_route",
        label: "冬城の改修図面から、封鎖壁を壊さない別経路を探す",
        outcome: "資料の導線をたどり、鏡列の裏にある保守用ハッチから観測室へ入った。",
        diagnosticWeights: weights({ INT: -0.25, STR: -0.25, EDU: 0.5 }),
        effects: [
          inc("story.timeUnits", -1),
          add("story.clues", "observation_room_location"),
          add("story.flags", "observation_room_service_entry")
        ],
        salience: 1
      })
    ],
    variants: [
      {
        id: "M15_has_measurement",
        conditions: [condition({ type: "clue", value: "hidden_room_measurement" })],
        priority: 10,
        bodyPrefix: "これまでに測った壁内寸法が、三つの声のうち一つだけと一致している。"
      }
    ],
    recordUnchosenAct: 4
  },
  {
    slotId: "M14",
    act: 4,
    title: "冬城の封鎖手順と角の向こう",
    primaryAxes: ["EDU", "POW"],
    ui: "cards",
    body: "観測室には、冬城が残した停止手順と、青黒い煙が漏れる観測窓がある。記録された方法を使えば装置の一部を安全に止められる可能性がある。一方、角の向こうの反応を直接観測すれば、今の状況に合う対処法を得られるかもしれない。",
    choices: [
      choice({
        id: "M14_use_notes",
        label: "冬城の停止手順を読み、記録どおりに準備する",
        outcome: "発振器・鏡列・非常電源の順序を確認し、最終封鎖に必要な操作を準備した。",
        diagnosticWeights: weights({ EDU: 1, POW: -0.75 }),
        effects: [
          inc("story.timeUnits", -1),
          add("story.clues", "fuyushiro_shutdown_notes"),
          add("story.clues", "oscillator_map"),
          add("story.flags", "shutdown_sequence_prepared")
        ],
        salience: 2
      }),
      choice({
        id: "M14_direct_observation",
        label: "観測窓を開き、角の向こうの反応を直接見る",
        outcome: "細長い影と青黒い分泌物を至近距離で確認した。相手もこちらを個人として認識する。",
        diagnosticWeights: weights({ EDU: -0.75, POW: 1 }),
        effects: [
          inc("mythos.angularExposure", 2),
          inc("mythos.houndPressure", 2),
          inc("mythos.houndManifestation", 1),
          set("mythos.houndStage", 2),
          add("mythos.markedCharacters", "player"),
          add("story.clues", "blue_ichor_sample"),
          add("story.clues", "inhuman_tracks")
        ],
        salience: 3
      }),
      choice({
        id: "M14_limited_contact",
        label: "記録を基に観測窓を限定開放し、反応だけ確認する",
        outcome: "防護手順と直接観測を組み合わせ、猟犬の出現条件を確認した。完全な視認は避けた。",
        diagnosticWeights: weights({ EDU: 0.5, POW: 0.5 }),
        effects: [
          inc("story.timeUnits", -1),
          inc("mythos.angularExposure", 1),
          inc("mythos.houndPressure", 1),
          add("story.clues", "hound_name_tindalos"),
          add("story.clues", "curved_room_limit"),
          add("story.flags", "limited_hound_observation")
        ],
        salience: 1
      }),
      choice({
        id: "M14_isolate_section",
        label: "観測窓へ触れず、区画ごと曲面材で隔離する",
        outcome: "原理や姿を確かめず、現在の出現経路だけを弱めた。最終処理に使える安全時間が増える。",
        diagnosticWeights: weights({ EDU: -0.25, POW: -0.25, CON: 0.5 }),
        effects: [
          inc("story.roundedSafety", 1),
          set("observer.state", "partial"),
          add("story.flags", "observation_window_isolated")
        ],
        salience: 1
      })
    ],
    variants: [
      {
        id: "M14_has_shutdown_notes",
        conditions: [condition({ type: "clue", value: "fuyushiro_shutdown_notes" })],
        priority: 10,
        bodyPrefix: "冬城の記録には、『見れば相手も見る』という警告が太字で残されている。"
      }
    ],
    recordUnchosenAct: 4
  },
  {
    slotId: "S04",
    act: 4,
    title: "倉持に起きたこと",
    primaryAxes: ["INT", "SAN_DEPTH"],
    ui: "quadrant",
    body: "観測器には、倉持が三つの時間状態へ分かれるまでの記録が残っている。断片から必要事項だけ推論することも、全記録を再生して複数の死・逃走・救援を本人の感覚で体験することもできる。",
    choices: [
      choice({
        id: "S04_fragments",
        label: "断片的な記録から真相を推論し、完全再生は避ける",
        outcome: "全体験を受けずに、A・B・Cが一人の倉持から分岐した時間状態だと結論づけた。",
        diagnosticWeights: weights({ INT: 0.75, SAN_DEPTH: -0.75 }),
        effects: [
          inc("story.timeUnits", -1),
          reveal("A"), reveal("B"), reveal("C"),
          add("story.clues", "kuramochi_pre_observation_memory"),
          add("story.clues", "kuramochi_shared_physiology")
        ],
        salience: 2
      }),
      choice({
        id: "S04_full_record",
        label: "記録を完全に再生し、三つの倉持の体験をすべて受け取る",
        outcome: "三つの時間状態を自分の記憶として体験した。真相は明確になったが、角の向こうの存在にも時間的な匂いを渡す。",
        diagnosticWeights: weights({ INT: 1, SAN_DEPTH: 1 }),
        effects: [
          inc("story.timeUnits", -1),
          inc("mythos.angularExposure", 2),
          inc("mythos.houndPressure", 2),
          set("mythos.houndStage", 2),
          add("mythos.markedCharacters", "player"),
          reveal("A"), reveal("B"), reveal("C"),
          add("story.clues", "kuramochi_pre_observation_memory"),
          add("story.clues", "kuramochi_shared_physiology"),
          add("story.clues", "kuramochi_audio_match"),
          add("story.clues", "single_fixation_blueprint")
        ],
        salience: 3
      }),
      choice({
        id: "S04_rescue_only",
        label: "救出に必要な情報だけ確認し、それ以上は見ない",
        outcome: "観測室の操作と倉持の身体反応だけを確認した。完全な真相は残るが、安全な救出条件は得た。",
        diagnosticWeights: weights({ INT: -0.75, SAN_DEPTH: -0.75 }),
        effects: [
          reveal("A"), reveal("B"), reveal("C"),
          add("story.clues", "kuramochi_shared_physiology"),
          add("story.clues", "single_fixation_blueprint")
        ],
        salience: 1
      }),
      choice({
        id: "S04_discard_record",
        label: "記録を破棄し、真相不明のまま不可逆的な決断へ進む",
        outcome: "倉持の体験記録を閉じた。三つの姿は残るが、どれが元の連続性を持つか判断する材料を失った。",
        diagnosticWeights: weights({ INT: -0.75, SAN_DEPTH: 0.75 }),
        effects: [
          inc("observer.lensIntegrity", -20),
          reveal("A"), reveal("B"), reveal("C"),
          add("story.flags", "kuramochi_record_discarded")
        ],
        salience: 2
      })
    ],
    variants: [
      {
        id: "S04_hound_near",
        conditions: [condition({ type: "houndStageAtLeast", value: 2 })],
        priority: 20,
        bodyPrefix: "記録の各場面の角に、同じ細長い影が少しずつ近づいている。"
      }
    ],
    recordUnchosenAct: 4
  },
  {
    slotId: "M13",
    act: 4,
    title: "雨声荘と他三施設",
    primaryAxes: ["DEX", "SIZ"],
    ui: "allocation",
    body: "倉持の記録再生と同時に、雨声荘の角が一斉に軋む。榊の端末には、冬城が改修した他三施設から同じ周波数の異常通知が入る。目の前の建物を直ちに処理するか、広域へ対応を拡張するかを決める必要がある。",
    choices: [
      choice({
        id: "M13_local_now",
        label: "雨声荘の露出した角を、直ちに曲面材で塞ぐ",
        outcome: "目の前の出現経路を素早く減らした。他施設への対応は後回しになる。",
        diagnosticWeights: weights({ DEX: 1, SIZ: -0.75 }),
        effects: [
          inc("story.timeUnits", -1),
          inc("story.roundedSafety", 2),
          add("story.flags", "local_corners_sealed")
        ],
        salience: 2
      }),
      choice({
        id: "M13_warn_network",
        label: "他三施設へ警告し、非常電源と改修作業を止めさせる",
        outcome: "雨声荘の処理は遅れたが、四棟全体へ被害が広がる可能性を下げた。",
        diagnosticWeights: weights({ DEX: -0.75, SIZ: 1 }),
        effects: [
          inc("story.timeUnits", -1),
          set("observer.angleNetworkState", "warned"),
          add("story.clues", "network_warning_channel"),
          add("story.flags", "other_facilities_warned")
        ],
        salience: 3
      }),
      choice({
        id: "M13_auto_warning",
        label: "最低限の応急封鎖を行い、自動警告を三施設へ送る",
        outcome: "雨声荘と広域の両方へ対応したが、どちらの処理も完全ではない。",
        diagnosticWeights: weights({ DEX: 0.5, SIZ: 0.5 }),
        effects: [
          inc("story.timeUnits", -2),
          inc("story.roundedSafety", 1),
          set("observer.angleNetworkState", "warned"),
          add("story.clues", "network_warning_channel"),
          add("story.flags", "partial_local_seal")
        ],
        salience: 1
      }),
      choice({
        id: "M13_evacuate",
        label: "現在地の人物と証拠を、球殻型退避槽へ移す",
        outcome: "即時解決や広域対応より、現状を崩さず人員と証拠を守った。",
        diagnosticWeights: weights({ DEX: -0.25, SIZ: -0.25, CON: 0.5 }),
        effects: [
          inc("story.timeUnits", -1),
          inc("story.roundedSafety", 2),
          set("story.companionCondition", "stable"),
          add("story.flags", "people_and_evidence_evacuated")
        ],
        salience: 1
      })
    ],
    variants: [
      {
        id: "M13_network_mapped",
        conditions: [condition({ type: "networkState", value: "mapped" })],
        priority: 20,
        bodyPrefix: "四棟の位置と連絡先は把握済みで、警告を具体的な設備停止指示にできる。"
      },
      {
        id: "M13_network_unknown",
        conditions: [condition({ type: "networkState", value: "unknown" })],
        priority: 5,
        bodyPrefix: "他施設の正確な役割は分からない。榊が拾った異常信号だけが手掛かりだ。"
      }
    ],
    recordUnchosenAct: 4
  },
  {
    slotId: "M16",
    act: 4,
    title: "救出か、四棟回路か",
    primaryAxes: ["POW", "SIZ"],
    ui: "map",
    body: "観測室の中心には三つの倉持の時間状態が重なり、壁内の金属角材は他三施設へ信号を送り続けている。時間角へ接近すれば倉持へ届く。四棟回路を追えば広域被害を止められる。",
    choices: [
      choice({
        id: "M16_rescue",
        label: "時間角へ入り、倉持の時間状態へ接触する",
        outcome: "倉持の救出を優先して時間角へ踏み込んだ。三状態との接触は容易になったが、猟犬にも個人として感知される。",
        diagnosticWeights: weights({ POW: 1, SIZ: -0.75 }),
        effects: [
          set("story.routes.finalScope", "rescue"),
          inc("mythos.angularExposure", 2),
          inc("mythos.houndPressure", 1),
          set("mythos.houndStage", 2),
          add("mythos.markedCharacters", "player"),
          reveal("A"), reveal("B"), reveal("C")
        ],
        salience: 3
      }),
      choice({
        id: "M16_network",
        label: "倉持との接触を遅らせ、四棟の角度回路を遮断する",
        outcome: "目の前の救出時間を使い、他施設へ伸びる回路を切った。手掛かりが十分なら広域信号は停止する。",
        diagnosticWeights: weights({ POW: -0.75, SIZ: 1 }),
        effects: [
          inc("story.timeUnits", -1),
          set("story.routes.finalScope", "network"),
          set("observer.angleNetworkState", "partially_severed"),
          add("story.flags", "network_sever_attempt")
        ],
        salience: 3
      }),
      choice({
        id: "M16_both",
        label: "中枢を地図として使い、救出と回路遮断を同時に試みる",
        outcome: "二つの目的を並行した。時間と安定性を失い、観測器にも操作手順を学習される。",
        diagnosticWeights: weights({ POW: 0.5, SIZ: 0.5 }),
        effects: [
          inc("story.timeUnits", -2),
          set("story.routes.finalScope", "both"),
          set("observer.angleNetworkState", "partially_severed"),
          inc("mythos.angularExposure", 1),
          inc("mythos.houndPressure", 1),
          reveal("A"), reveal("B"), reveal("C"),
          add("story.flags", "combined_rescue_network_attempt")
        ],
        salience: 1
      }),
      choice({
        id: "M16_local",
        label: "雨声荘だけを再封鎖し、時間角と広域回路の両方から距離を取る",
        outcome: "中心にも広域問題にも深入りせず、現在地の封鎖準備を優先した。",
        diagnosticWeights: weights({ POW: -0.25, SIZ: -0.25, CON: 0.5 }),
        effects: [
          inc("story.timeUnits", -1),
          set("story.routes.finalScope", "local"),
          add("story.flags", "local_reseal_prepared")
        ],
        salience: 1
      })
    ],
    variants: [
      {
        id: "M16_network_mapped",
        conditions: [condition({ type: "networkState", value: "mapped" })],
        priority: 20,
        bodyPrefix: "四棟回路の結節点は特定済みで、遮断は現実的な選択になっている。"
      },
      {
        id: "M16_network_warned",
        conditions: [condition({ type: "networkState", value: "warned" })],
        priority: 15,
        bodyPrefix: "他施設では警告を受けた担当者が待機しており、こちらの操作に合わせて電源を落とせる。"
      }
    ],
    recordUnchosenAct: 4
  },
  {
    slotId: "L04",
    act: 4,
    title: "最初に回収する倉持の情報",
    primaryAxes: ["LUCK", "STR"],
    ui: "dice",
    body: "観測室には三つの時間角が開き、それぞれ倉持A・B・Cの情報へつながっている。ここで帰還者は決めない。限られた時間の中で、どの情報を最初に回収するかを決める。",
    choices: [
      choice({
        id: "L04_random",
        label: "ダイスで一つの時間角を選び、最初の情報源にする",
        outcome: "どの倉持へ最初に接触するかを偶然へ委ねた。出目が選んだ時間状態の情報カードが開く。",
        diagnosticWeights: weights({ LUCK: 1, STR: -0.75 }),
        effects: [selectInfo("random")],
        usesDice: true,
        diceThreshold: 100,
        salience: 2
      }),
      choice({
        id: "L04_strongest",
        label: "最も強く反応する時間角を、自分の判断でこじ開ける",
        outcome: "最も強い信号へ直接介入し、倉持Aの観測記録を最初に回収した。角の安定性は低下する。",
        diagnosticWeights: weights({ LUCK: -0.75, STR: 1 }),
        effects: [
          selectInfo("strongest"),
          inc("story.structuralDamage", 1),
          inc("mythos.houndPressure", 1)
        ],
        salience: 3
      }),
      choice({
        id: "L04_probe",
        label: "一度だけ反応試験を行い、その結果を基に時間角を開く",
        outcome: "偶然を情報として利用し、最も連続性の高そうな倉持へ接触を試みた。",
        diagnosticWeights: weights({ LUCK: 0.5, STR: 0.5 }),
        effects: [inc("story.timeUnits", -1)],
        usesDice: true,
        diceThreshold: 70,
        diceEffects: {
          success: [selectInfo("probe")],
          failure: [selectInfo("random"), inc("mythos.houndPressure", 1)]
        },
        salience: 1
      }),
      choice({
        id: "L04_companion",
        label: "榊または同行者に、最初に接触する時間状態を選んでもらう",
        outcome: "自分の介入や偶然ではなく、人間関係と外部視点を判断材料にした。",
        diagnosticWeights: weights({ LUCK: -0.25, STR: -0.25, APP: 0.5 }),
        effects: [
          selectInfo("companion"),
          inc("story.trust.sakaki", 1),
          inc("story.trust.sumie", 1)
        ],
        salience: 1
      })
    ],
    variants: [
      {
        id: "L04_rescue_scope",
        conditions: [condition({ type: "route", route: "finalScope", value: "rescue" })],
        priority: 20,
        bodyPrefix: "時間角は倉持の三状態へ直接つながり、それぞれの声が同時に助けを求めている。"
      },
      {
        id: "L04_network_scope",
        conditions: [condition({ type: "route", route: "finalScope", value: "network" })],
        priority: 20,
        bodyPrefix: "回路遮断で時間が減り、三状態のうち一つの情報しか十分に回収できない。"
      },
      {
        id: "L04_both_scope",
        conditions: [condition({ type: "route", route: "finalScope", value: "both" })],
        priority: 20,
        bodyPrefix: "中枢と回路の両方を動かしたため、三つの時間角が不規則に入れ替わっている。"
      },
      {
        id: "L04_local_scope",
        conditions: [condition({ type: "route", route: "finalScope", value: "local" })],
        priority: 20,
        bodyPrefix: "再封鎖を始める前に、一つだけ倉持の状態を確認できる。"
      }
    ],
    recordUnchosenAct: 4
  },
  {
    slotId: "S03",
    act: 5,
    title: "倉持の最終固定",
    primaryAxes: ["APP", "SAN_DEPTH"],
    ui: "quadrant",
    body: "倉持A・B・Cはすべて同一人物から分岐した時間状態であり、通常の単一固定機構が安全に現実へ残せるのは一人だけだ。誰を選ぶかとは別に、関係・記憶・不可逆的な代償をどこまで受け入れるかを決めなければならない。",
    choices: [
      choice({
        id: "S03_preserve_relation",
        label: "一人を選び、関係記憶を保ったまま固定できる別解を探す",
        outcome: "時間を使って、得た手掛かりから最も安定した固定条件を組み立てる。完全な保証はないが、関係の断絶を避ける。",
        diagnosticWeights: weights({ APP: 0.75, SAN_DEPTH: -0.75 }),
        effects: [
          inc("story.timeUnits", -1),
          add("story.flags", "fixation_policy_preserve_relation")
        ],
        followUp: fixationFollowUp,
        salience: 2
      }),
      choice({
        id: "S03_accept_memory_cost",
        label: "一人を確実に救うため、共有記憶の一部が失われる代償を受け入れる",
        outcome: "選んだ倉持の固定を強める代わりに、榊や周囲との共有記憶の一部を閉じる。",
        diagnosticWeights: weights({ APP: 1, SAN_DEPTH: 1 }),
        effects: [
          inc("kuramochi.fixationStability", 1),
          add("story.flags", "shared_memory_cost_accepted")
        ],
        followUp: fixationFollowUp,
        salience: 3
      }),
      choice({
        id: "S03_body_only",
        label: "関係記憶を判断材料にせず、身体的連続性が高い一人だけを固定する",
        outcome: "感情的な約束や完全な人格継続を求めず、肉体と生理的連続性を基準に帰還させる。",
        diagnosticWeights: weights({ APP: -0.75, SAN_DEPTH: -0.75 }),
        effects: [add("story.flags", "body_continuity_fixation")],
        followUp: fixationFollowUp,
        salience: 1
      }),
      choice({
        id: "S03_no_fixation",
        label: "誰も固定せず、三つの時間状態ごと観測室を封鎖する",
        outcome: "一人を本物として選ぶことを拒み、倉持を時間状態の中へ残したまま外部被害を止める方針を取る。",
        diagnosticWeights: weights({ APP: -0.75, SAN_DEPTH: 0.75 }),
        effects: [
          set("kuramochi.state", "unfixed"),
          set("kuramochi.fixedVariant", null),
          add("story.flags", "no_kuramochi_fixed")
        ],
        salience: 2
      }),
      choice({
        id: "S03_multiple",
        label: "単一固定機構を解除し、複数の倉持を同時に帰還させる",
        outcome: "誰かを閉じることを拒み、複数の時間経路を現実へ残す。猟犬が追跡できる経路も増える。",
        diagnosticWeights: weights({ APP: 0.5, SAN_DEPTH: 1 }),
        effects: [
          { op: "enableMultipleFixation" },
          set("mythos.houndStage", 3),
          set("mythos.fullManifestationOccurred", true),
          add("mythos.markedCharacters", "player"),
          add("story.flags", "single_fixation_safety_removed")
        ],
        salience: 3
      })
    ],
    variants: [
      {
        id: "S03_first_a",
        conditions: [condition({ type: "kuramochiFirstInfo", value: "A" })],
        priority: 20,
        bodyPrefix: "最初に詳しく知ったのは、真相と危険を最も多く抱える倉持Aだった。"
      },
      {
        id: "S03_first_b",
        conditions: [condition({ type: "kuramochiFirstInfo", value: "B" })],
        priority: 20,
        bodyPrefix: "最初に詳しく知ったのは、身体状態が最も安定した倉持Bだった。"
      },
      {
        id: "S03_first_c",
        conditions: [condition({ type: "kuramochiFirstInfo", value: "C" })],
        priority: 20,
        bodyPrefix: "最初に詳しく知ったのは、榊との関係記憶を最も残す倉持Cだった。"
      }
    ]
  },
  {
    slotId: "S02",
    act: 5,
    title: "最後の角",
    primaryAxes: ["CON", "SAN_DEPTH"],
    ui: "quadrant",
    body: "倉持の固定方針が決まり、残るのは観測器・四棟回路・露出した角の処理だ。最後まで封鎖すれば、観測室に残る記録や閉じた時間状態は戻らない。中止すれば生存を優先できるが、時間信号は残る。無計画な破壊は大量の新しい角を生む。",
    choices: [
      choice({
        id: "S02_limited_reseal",
        label: "撤退限界を決め、その範囲で観測器と角の再封鎖を続ける",
        outcome: "方針を維持しつつ、不可逆的な損失を一定範囲へ抑えた。封鎖は限定的だが、曲面経路から退避できる。",
        diagnosticWeights: weights({ CON: 0.75, SAN_DEPTH: -0.75 }),
        effects: [
          inc("story.timeUnits", -1),
          set("observer.state", "resealed"),
          set("observer.oscillatorState", "stopped"),
          set("observer.emergencyPowerState", "stopped"),
          add("story.flags", "limited_reseal"),
          add("story.flags", "curved_exit_used")
        ],
        salience: 2
      }),
      choice({
        id: "S02_complete_reseal",
        label: "閉じた可能性と記録が失われることを受け入れ、封鎖を最後まで完遂する",
        outcome: "発振器を止め、鏡列を固定し、露出した角を曲面化する。代償を残したまま、処理を完遂した。",
        diagnosticWeights: weights({ CON: 1, SAN_DEPTH: 1 }),
        effects: [
          set("observer.state", "resealed"),
          set("observer.oscillatorState", "stopped"),
          set("observer.emergencyPowerState", "stopped"),
          inc("story.roundedSafety", 2),
          add("story.flags", "complete_reseal"),
          add("story.flags", "curved_exit_used")
        ],
        salience: 3
      }),
      choice({
        id: "S02_retreat",
        label: "封鎖を中止し、全員で曲面経路から撤退する",
        outcome: "解決方針を変更して生存を優先した。観測器と時間信号は部分的に残る。",
        diagnosticWeights: weights({ CON: -0.75, SAN_DEPTH: -0.75 }),
        effects: [
          set("observer.state", "partial"),
          add("story.flags", "retreated_before_reseal"),
          add("story.flags", "curved_exit_used")
        ],
        salience: 1
      }),
      choice({
        id: "S02_destroy_building",
        label: "封鎖計画を捨て、観測室と建物を一気に崩して終わらせる",
        outcome: "建物は崩れ始めた。装置は損傷したが、瓦礫と金属枠に無数の新しい角が生まれ、青黒い煙が一斉に漏れる。",
        diagnosticWeights: weights({ CON: -0.75, SAN_DEPTH: 0.75 }),
        effects: [
          set("observer.state", "destroyed_badly"),
          inc("story.structuralDamage", 3),
          inc("story.cornerBreaches", 3),
          inc("mythos.houndPressure", 3),
          inc("mythos.houndManifestation", 2),
          set("mythos.houndStage", 2),
          add("mythos.markedCharacters", "player"),
          add("story.flags", "building_destroyed_unplanned")
        ],
        salience: 3
      })
    ],
    variants: [
      {
        id: "S02_marked",
        conditions: [condition({ type: "houndStageAtLeast", value: 2 })],
        priority: 20,
        bodyPrefix: "観測器を止めても、角の向こうの存在はすでに場所ではなく人物を追っている。"
      }
    ]
  }
] as const;

export const SCENE_BY_SLOT = Object.fromEntries(
  SCENES.map((scene) => [scene.slotId, scene])
) as Record<MeasurementSlotId, SceneDefinition>;

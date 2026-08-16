import type { DiagnosticAxis, MeasurementSlotId } from "./types.js";

export interface SliderBand {
  max: number;
  choiceId: string;
  label: string;
  explanation: string;
}

export interface SliderResponseConfig {
  kind: "slider";
  minAxis: DiagnosticAxis;
  maxAxis: DiagnosticAxis;
  prompt: string;
  minLabel: string;
  maxLabel: string;
  minHint: string;
  maxHint: string;
  defaultValue: number;
  bands: SliderBand[];
}

export interface QuadrantAxisConfig {
  axis: DiagnosticAxis;
  label: string;
  lowLabel: string;
  highLabel: string;
  lowHint: string;
  highHint: string;
}

export interface QuadrantResponseConfig {
  kind: "quadrant";
  prompt: string;
  xAxis: QuadrantAxisConfig;
  yAxis: QuadrantAxisConfig;
  choices: {
    lowLow: string;
    highLow: string;
    lowHigh: string;
    highHigh: string;
  };
  summaries: {
    lowLow: string;
    highLow: string;
    lowHigh: string;
    highHigh: string;
  };
  extraChoiceIds?: string[];
}

export interface AllocationItemConfig {
  id: string;
  label: string;
  hint: string;
  dominantChoiceId: string;
}

export interface AllocationResponseConfig {
  kind: "allocation";
  prompt: string;
  budget: number;
  unitLabel: string;
  items: AllocationItemConfig[];
  balancedChoiceId: string;
  balancedLabel: string;
}

export interface RankingResponseConfig {
  kind: "ranking";
  prompt: string;
  instructions: string;
  choiceIds: string[];
}

export type StructuredResponseConfig =
  | SliderResponseConfig
  | QuadrantResponseConfig
  | AllocationResponseConfig
  | RankingResponseConfig;

export const RESPONSE_CONFIGS: Partial<Record<MeasurementSlotId, StructuredResponseConfig>> = {
  M03: {
    kind: "allocation",
    prompt: "現地へ向かう前に使える調査資源は4点です。合計が4点になるよう配分してください。",
    budget: 4,
    unitLabel: "点",
    items: [
      {
        id: "immediate",
        label: "音声の即時保存",
        hint: "消える前に内容を確保する。正式な証明力は弱い。",
        dominantChoiceId: "M03_quick_copy"
      },
      {
        id: "formal",
        label: "正式ログの保全",
        hint: "時刻・送信経路・編集履歴を残す。時間がかかる。",
        dominantChoiceId: "M03_formal_log"
      },
      {
        id: "human",
        label: "倉持の行動確認",
        hint: "同僚から録音前後の状況を聞く。技術情報は少ない。",
        dominantChoiceId: "M03_colleague"
      }
    ],
    balancedChoiceId: "M03_parallel",
    balancedLabel: "複数経路へ分散して最低限を確保する"
  },
  M11: {
    kind: "ranking",
    prompt: "この場面で最初に行うことから順に並べてください。",
    instructions: "上下ボタンで順序を変えます。最上位の行動を実行し、全順位は今後の設問改善用ログに残します。",
    choiceIds: ["M11_stop_and_support", "M11_assign_role", "M11_brief_support", "M11_send_out"]
  },
  L03: {
    kind: "slider",
    minAxis: "CON",
    maxAxis: "LUCK",
    prompt: "地下へ向かう方法を、安全重視から速度重視までの連続した判断として示してください。",
    minLabel: "安全と確実性を優先",
    maxLabel: "速度を優先し危険を引き受ける",
    minHint: "時間を使っても、角と判定を避ける。",
    maxHint: "短時間で進む代わりに、判定と怪異接触を受け入れる。",
    defaultValue: 50,
    bands: [
      {
        max: 20,
        choiceId: "L03_curved_slope",
        label: "曲面スロープ",
        explanation: "時間を使い、最も安全な遠回りを選ぶ。"
      },
      {
        max: 45,
        choiceId: "L03_observe_cycle",
        label: "周期観察",
        explanation: "すぐには進まず、変形の規則から安全経路を探す。"
      },
      {
        max: 75,
        choiceId: "L03_reinforced",
        label: "補強した近道",
        explanation: "時間と資材を使い、危険を抑えて近道する。"
      },
      {
        max: 100,
        choiceId: "L03_shortcut",
        label: "崩落した近道",
        explanation: "成功率40％の判定へ進行を委ね、最短で地下へ向かう。"
      }
    ]
  },
  S01: {
    kind: "quadrant",
    prompt: "未知への関心と、精神的・不可逆的代償の許容は別々に設定できます。二本とも動かしてください。",
    xAxis: {
      axis: "POW",
      label: "時間角をどこまで知りたいか",
      lowLabel: "深入りしない",
      highLabel: "可能な限り観測する",
      lowHint: "現在の侵入阻止を優先する。",
      highHint: "倉持の別未来と時間角の全体像を求める。"
    },
    yAxis: {
      axis: "SAN_DEPTH",
      label: "観測による代償をどこまで受け入れるか",
      lowLabel: "記憶と安全を守る",
      highLabel: "喪失や不可逆性も受け入れる",
      lowHint: "体験を自分の記憶にしない。",
      highHint: "複数の死や時間状態の喪失も物語上の代償として受け入れる。"
    },
    choices: {
      lowLow: "S01_isolate",
      highLow: "S01_remote",
      lowHigh: "S01_destroy_record",
      highHigh: "S01_direct"
    },
    summaries: {
      lowLow: "未知へ深入りせず、自分と現場の安全圏を守る方針。",
      highLow: "未知は調べるが、遠隔・防護によって精神的代償を制限する方針。",
      lowHigh: "未知の理解は求めないが、情報や時間状態を閉じる不可逆的な結果は受け入れる方針。",
      highHigh: "未知へ直接接続し、理解と精神的代償の両方を引き受ける方針。"
    }
  },
  S04: {
    kind: "quadrant",
    prompt: "真相を理解する深さと、記録を体験する代償の許容を別々に設定してください。",
    xAxis: {
      axis: "INT",
      label: "三つの倉持の真相をどこまで理解したいか",
      lowLabel: "救出に必要な範囲だけ",
      highLabel: "分岐の全構造まで理解する",
      lowHint: "操作条件と身体反応だけ確認する。",
      highHint: "記憶・因果・連続性まで組み立てる。"
    },
    yAxis: {
      axis: "SAN_DEPTH",
      label: "本人の体験を自分の記憶として受ける代償",
      lowLabel: "体験は受け取らない",
      highLabel: "死や喪失も含めて受け取る",
      lowHint: "心理的距離を保つ。",
      highHint: "完全記録の不可逆的な影響を受け入れる。"
    },
    choices: {
      lowLow: "S04_rescue_only",
      highLow: "S04_fragments",
      lowHigh: "S04_discard_record",
      highHigh: "S04_full_record"
    },
    summaries: {
      lowLow: "完全な真相より、安全な救出条件を優先する方針。",
      highLow: "体験への接続は避け、断片を組み合わせて真相へ近づく方針。",
      lowHigh: "真相の理解は求めず、記録を閉じる不可逆的な決断を受け入れる方針。",
      highHigh: "全記録へ接続し、真相と精神的代償の両方を引き受ける方針。"
    }
  },
  M13: {
    kind: "allocation",
    prompt: "今すぐ使える対応資源は4点です。合計が4点になるよう配分してください。",
    budget: 4,
    unitLabel: "点",
    items: [
      {
        id: "local",
        label: "雨声荘の角を塞ぐ",
        hint: "目の前の侵入経路を減らす。他施設への対応は遅れる。",
        dominantChoiceId: "M13_local_now"
      },
      {
        id: "network",
        label: "他三施設へ警告する",
        hint: "都市規模の拡散を抑える。雨声荘の処理は遅れる。",
        dominantChoiceId: "M13_warn_network"
      },
      {
        id: "evacuation",
        label: "人物と証拠を退避させる",
        hint: "人員と証拠を守る。即時解決と広域対応は進まない。",
        dominantChoiceId: "M13_evacuate"
      }
    ],
    balancedChoiceId: "M13_auto_warning",
    balancedLabel: "応急封鎖・警告・退避へ資源を分散する"
  },
  S03: {
    kind: "quadrant",
    prompt: "関係記憶の重視と、不可逆的な喪失の許容を別々に設定してください。",
    xAxis: {
      axis: "APP",
      label: "倉持と周囲の関係・記憶をどこまで判断材料にするか",
      lowLabel: "身体的連続性を中心にする",
      highLabel: "関係と記憶を中心にする",
      lowHint: "感情的な約束を固定条件から外す。",
      highHint: "榊との記憶や本人らしさを重視する。"
    },
    yAxis: {
      axis: "SAN_DEPTH",
      label: "一つの時間状態を残すための喪失をどこまで受け入れるか",
      lowLabel: "断絶をできるだけ避ける",
      highLabel: "不可逆的な代償も受け入れる",
      lowHint: "別解や限定的な固定を探す。",
      highHint: "共有記憶や他の時間状態が閉じることを受け入れる。"
    },
    choices: {
      lowLow: "S03_body_only",
      highLow: "S03_preserve_relation",
      lowHigh: "S03_no_fixation",
      highHigh: "S03_accept_memory_cost"
    },
    summaries: {
      lowLow: "身体的連続性を基準に一人を固定し、関係への介入と大きな代償を抑える方針。",
      highLow: "関係と記憶を守りながら、時間を使って別の固定条件を探す方針。",
      lowHigh: "一人を本物として選ばず、倉持を残したまま時間状態を閉じる方針。",
      highHigh: "関係を重視して一人を救い、そのための共有記憶の喪失を受け入れる方針。"
    },
    extraChoiceIds: ["S03_multiple"]
  },
  S02: {
    kind: "quadrant",
    prompt: "決めた処理をどこまで完遂するかと、不可逆的な損失の許容を別々に設定してください。",
    xAxis: {
      axis: "CON",
      label: "封鎖方針をどこまで維持するか",
      lowLabel: "状況に応じて中止・変更する",
      highLabel: "最後まで完遂する",
      lowHint: "生存や即時停止を優先して方針を切り替える。",
      highHint: "時間と負担が増えても、決めた封鎖を続ける。"
    },
    yAxis: {
      axis: "SAN_DEPTH",
      label: "閉じた時間状態・記録の喪失をどこまで受け入れるか",
      lowLabel: "損失を限定する",
      highLabel: "完全に失われることも受け入れる",
      lowHint: "撤退可能性と回復余地を残す。",
      highHint: "戻せない代償を払ってでも事件を終える。"
    },
    choices: {
      lowLow: "S02_retreat",
      highLow: "S02_limited_reseal",
      lowHigh: "S02_destroy_building",
      highHigh: "S02_complete_reseal"
    },
    summaries: {
      lowLow: "封鎖方針を中止し、生存と回復可能性を優先する方針。",
      highLow: "撤退限界を保ちながら、損失を限定して封鎖を続ける方針。",
      lowHigh: "当初の封鎖計画を捨て、不可逆的な破壊で即時終了を狙う方針。",
      highHigh: "記録と閉じた可能性が失われても、封鎖を最後まで完遂する方針。"
    }
  }
};

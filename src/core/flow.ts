import type { MeasurementSlotId } from "./types.js";

export interface FlowNode {
  id: string;
  label: string;
  slotId?: MeasurementSlotId;
  shape?: "box" | "diamond" | "round";
}

export interface FlowEdge {
  from: string;
  to: string;
  label?: string;
}

export const FLOW_NODES: readonly FlowNode[] = [
  { id: "P00", label: "開始前説明・データ利用表示", shape: "round" },
  { id: "P01", label: "榊からの依頼・倉持の通常音声", shape: "box" },
  { id: "M03", label: "M03 消去される送信データ\nDEX / EDU", slotId: "M03" },
  { id: "LINK", label: "第二音声を分離・再生\nobserverLink成立" },
  { id: "M01", label: "M01 榊の記憶か時間構造か\nAPP / INT", slotId: "M01" },
  { id: "M06", label: "M06 元住人か四棟の回路か\nAPP / SIZ", slotId: "M06" },
  { id: "R1A", label: "元住人・須藤澄江" },
  { id: "R1B", label: "冬城の設計記録" },
  { id: "R1C", label: "四棟の広域調査" },
  { id: "R1D", label: "直ちに雨声荘へ" },
  { id: "M02", label: "M02 曲面封鎖を保全するか開くか\nCON / STR", slotId: "M02" },
  { id: "L02", label: "L02 管理室の鍵\n幸運 / INT", slotId: "L02" },
  { id: "M05", label: "M05 図面にない観測室\nEDU / INT", slotId: "M05" },
  { id: "M09", label: "M09 壁の向こうの倉持の声\nAPP / STR", slotId: "M09" },
  { id: "M11", label: "M11 同行者・通信相手の動揺\nAPP / CON", slotId: "M11" },
  { id: "M04", label: "M04 鋭角化する廊下\nDEX / STR", slotId: "M04" },
  { id: "L03", label: "L03 近道か曲面スロープか\n幸運 / CON", slotId: "L03" },
  { id: "R2A", label: "猟犬の痕跡がある近道" },
  { id: "R2B", label: "安全な曲面スロープ" },
  { id: "R2C", label: "補強した仮設経路" },
  { id: "R2D", label: "周期を読んだ保守経路" },
  { id: "C1", label: "測定不足あり？", shape: "diamond" },
  { id: "AEARLY", label: "適応Scene 0～1" },
  { id: "M07", label: "M07 自分の未来の声\nCON / POW", slotId: "M07" },
  { id: "R3A", label: "予定経路を維持" },
  { id: "R3B", label: "声を追う" },
  { id: "R3C", label: "時間制限付きで追う" },
  { id: "R3D", label: "声を封じる" },
  { id: "M10", label: "M10 選ばなかった自分\nINT / POW", slotId: "M10" },
  { id: "S01", label: "S01 時間角をどこまで観測するか\nPOW / SAN", slotId: "S01" },
  { id: "M08", label: "M08 冬城の記録か四棟の構造か\nEDU / SIZ", slotId: "M08" },
  { id: "M12", label: "M12 一時的な扉\nCON / DEX", slotId: "M12" },
  { id: "R4A", label: "扉を無視" },
  { id: "R4B", label: "消える前に入る" },
  { id: "R4C", label: "道具だけ送る" },
  { id: "R4D", label: "出現周期を再現" },
  { id: "L01", label: "L01 変化する床\n幸運 / DEX", slotId: "L01" },
  { id: "C2", label: "中盤の測定不足あり？", shape: "diamond" },
  { id: "AMID", label: "適応Scene 0～1" },
  { id: "M15", label: "M15 本当の観測室へ到達\nINT / STR", slotId: "M15" },
  { id: "M14", label: "M14 冬城の封鎖手順か直接観測か\nEDU / POW", slotId: "M14" },
  { id: "S04", label: "S04 倉持の全記録を再生するか\nINT / SAN", slotId: "S04" },
  { id: "M13", label: "M13 雨声荘か他三施設か\nDEX / SIZ", slotId: "M13" },
  { id: "M16", label: "M16 倉持救出か回路遮断か\nPOW / SIZ", slotId: "M16" },
  { id: "R5A", label: "時間角へ入り救出" },
  { id: "R5B", label: "四棟の回路を遮断" },
  { id: "R5C", label: "中枢から両方を制御" },
  { id: "R5D", label: "雨声荘だけ再封鎖" },
  { id: "L04", label: "L04 最初に回収する倉持の情報\n幸運 / STR", slotId: "L04" },
  { id: "C3", label: "終盤の測定不足あり？", shape: "diamond" },
  { id: "ALATE", label: "適応Scene 0～2" },
  { id: "S03", label: "S03 倉持の最終固定\nAPP / SAN", slotId: "S03" },
  { id: "S02", label: "S02 最後の角と観測器の処理\nCON / SAN", slotId: "S02" },
  { id: "ENDJ", label: "物語状態からエンディング判定", shape: "diamond" },
  { id: "EA", label: "Ending A 角のない朝", shape: "round" },
  { id: "EB", label: "Ending B 違う昨日を持つ男", shape: "round" },
  { id: "EC", label: "Ending C 卵殻の檻", shape: "round" },
  { id: "ED", label: "Ending D 追跡は終わらない", shape: "round" },
  { id: "EE", label: "Ending E 一軒ではない", shape: "round" },
  { id: "EF", label: "Ending F 選ばれなかった全員", shape: "round" },
  { id: "EG", label: "Ending G 明日からの録音", shape: "round" }
] as const;

export const FLOW_EDGES: readonly FlowEdge[] = [
  { from: "P00", to: "P01" },
  { from: "P01", to: "M03" },
  { from: "M03", to: "LINK" },
  { from: "LINK", to: "M01" },
  { from: "M01", to: "M06" },
  { from: "M06", to: "R1A", label: "元住人" },
  { from: "M06", to: "R1B", label: "設計記録" },
  { from: "M06", to: "R1C", label: "広域調査" },
  { from: "M06", to: "R1D", label: "即行" },
  { from: "R1A", to: "M02" }, { from: "R1B", to: "M02" },
  { from: "R1C", to: "M02" }, { from: "R1D", to: "M02" },
  { from: "M02", to: "L02" }, { from: "L02", to: "M05" },
  { from: "M05", to: "M09" }, { from: "M09", to: "M11" },
  { from: "M11", to: "M04" }, { from: "M04", to: "L03" },
  { from: "L03", to: "R2A", label: "近道" },
  { from: "L03", to: "R2B", label: "曲面スロープ" },
  { from: "L03", to: "R2C", label: "補強" },
  { from: "L03", to: "R2D", label: "観察" },
  { from: "R2A", to: "C1" }, { from: "R2B", to: "C1" },
  { from: "R2C", to: "C1" }, { from: "R2D", to: "C1" },
  { from: "C1", to: "AEARLY", label: "あり" },
  { from: "C1", to: "M07", label: "なし" },
  { from: "AEARLY", to: "M07" },
  { from: "M07", to: "R3A", label: "維持" },
  { from: "M07", to: "R3B", label: "追跡" },
  { from: "M07", to: "R3C", label: "限定" },
  { from: "M07", to: "R3D", label: "封印" },
  { from: "R3A", to: "M10" }, { from: "R3B", to: "M10" },
  { from: "R3C", to: "M10" }, { from: "R3D", to: "M10" },
  { from: "M10", to: "S01" }, { from: "S01", to: "M08" },
  { from: "M08", to: "M12" },
  { from: "M12", to: "R4A", label: "無視" },
  { from: "M12", to: "R4B", label: "入る" },
  { from: "M12", to: "R4C", label: "道具" },
  { from: "M12", to: "R4D", label: "再現" },
  { from: "R4A", to: "L01" }, { from: "R4B", to: "L01" },
  { from: "R4C", to: "L01" }, { from: "R4D", to: "L01" },
  { from: "L01", to: "C2" },
  { from: "C2", to: "AMID", label: "あり" },
  { from: "C2", to: "M15", label: "なし" },
  { from: "AMID", to: "M15" },
  { from: "M15", to: "M14" }, { from: "M14", to: "S04" },
  { from: "S04", to: "M13" }, { from: "M13", to: "M16" },
  { from: "M16", to: "R5A", label: "救出" },
  { from: "M16", to: "R5B", label: "回路" },
  { from: "M16", to: "R5C", label: "両方" },
  { from: "M16", to: "R5D", label: "局地" },
  { from: "R5A", to: "L04" }, { from: "R5B", to: "L04" },
  { from: "R5C", to: "L04" }, { from: "R5D", to: "L04" },
  { from: "L04", to: "C3" },
  { from: "C3", to: "ALATE", label: "あり" },
  { from: "C3", to: "S03", label: "なし" },
  { from: "ALATE", to: "S03" },
  { from: "S03", to: "S02" }, { from: "S02", to: "ENDJ" },
  { from: "ENDJ", to: "EA" }, { from: "ENDJ", to: "EB" },
  { from: "ENDJ", to: "EC" }, { from: "ENDJ", to: "ED" },
  { from: "ENDJ", to: "EE" }, { from: "ENDJ", to: "EF" },
  { from: "ENDJ", to: "EG" }
] as const;

function escapeLabel(label: string): string {
  return label.replaceAll('"', "'").replaceAll("\n", "<br/>");
}

function renderNode(node: FlowNode): string {
  const label = escapeLabel(node.label);
  switch (node.shape) {
    case "diamond": return `    ${node.id}{"${label}"}`;
    case "round": return `    ${node.id}(["${label}"])`;
    default: return `    ${node.id}["${label}"]`;
  }
}

export function renderMermaid(): string {
  const lines = ["flowchart TD", ...FLOW_NODES.map(renderNode)];
  for (const edge of FLOW_EDGES) {
    lines.push(edge.label
      ? `    ${edge.from} -->|${edge.label}| ${edge.to}`
      : `    ${edge.from} --> ${edge.to}`);
  }
  return `${lines.join("\n")}\n`;
}

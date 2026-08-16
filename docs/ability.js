import { DIAGNOSTIC_AXES } from "./core/constants.js";
import { estimateTheta } from "./core/scoring.js";
const ABILITY_META = [
    {
        id: "STR", sourceAxis: "STR", label: "直接介入性", shortLabel: "STR", diceFamily: "3D6", betaScale: 0.265,
        highTag: "直接介入", lowTag: "間接解決",
        highDescription: "障害へ自分から働きかけ、状況を明確に動かす判断が多く見られます。",
        lowDescription: "準備・交渉・迂回によって、直接衝突せず状況をほどく判断が多く見られます。"
    },
    {
        id: "CON", sourceAxis: "CON", label: "方針維持性", shortLabel: "CON", diceFamily: "3D6", betaScale: 0.26,
        highTag: "方針維持", lowTag: "柔軟転換",
        highDescription: "時間や負担が増えても、選んだ目的と手順を維持する傾向があります。",
        lowDescription: "状況の変化に応じて、当初の計画を手放し新しい方針へ移る傾向があります。"
    },
    {
        id: "SIZ", sourceAxis: "SIZ", label: "問題規模拡張性", shortLabel: "SIZ", diceFamily: "2D6+6", betaScale: 0.255,
        highTag: "広域把握", lowTag: "局所集中",
        highDescription: "目の前の事件を、地域・歴史・再発防止まで含む大きな構造として捉えます。",
        lowDescription: "調査範囲を広げすぎず、現在地と現在の目的へ集中する傾向があります。"
    },
    {
        id: "DEX", sourceAxis: "DEX", label: "即応・転換性", shortLabel: "DEX", diceFamily: "3D6", betaScale: 0.265,
        highTag: "即応転換", lowTag: "順序処理",
        highDescription: "一時的な機会を捉え、現場で手順を組み替えながら進む傾向があります。",
        lowDescription: "行動順序を整え、一つずつ再現可能な方法で処理する傾向があります。"
    },
    {
        id: "APP", sourceAxis: "APP", label: "関係参照性", shortLabel: "APP", diceFamily: "3D6", betaScale: 0.24,
        highTag: "関係参照", lowTag: "課題分離",
        highDescription: "人物の感情・信頼・関係変化を、事件解決と同じ重さで判断材料にします。",
        lowDescription: "人間関係と課題を分け、情報・安全・目的を優先して判断する傾向があります。"
    },
    {
        id: "INT", sourceAxis: "INT", label: "推論構築性", shortLabel: "INT", diceFamily: "2D6+6", betaScale: 0.245,
        highTag: "推論構築", lowTag: "実地確認",
        highDescription: "複数の証拠を結び、説明される前に構造や真相を組み立てようとします。",
        lowDescription: "不確かな仮説を急がず、具体的な行動・結果・現場確認を優先します。"
    },
    {
        id: "POW", sourceAxis: "POW", label: "怪異関与性", shortLabel: "POW", diceFamily: "3D6", betaScale: 0.26,
        highTag: "怪異関与", lowTag: "怪異隔離",
        highDescription: "理解不能な現象でも、接近・観察・対話を通して関与し続ける傾向があります。",
        lowDescription: "怪異そのものへ深入りせず、隔離・遠隔観測・人間側の目的を優先します。"
    },
    {
        id: "EDU", sourceAxis: "EDU", label: "外部知識参照性", shortLabel: "EDU", diceFamily: "3D6+3", betaScale: 0.26,
        highTag: "記録参照", lowTag: "現場試行",
        highDescription: "文献・記録・専門知識・過去の事例を利用して判断する傾向があります。",
        lowDescription: "既存知識を待たず、現在の現場と直接経験から進める傾向があります。"
    },
    {
        id: "SAN", sourceAxis: "SAN_DEPTH", label: "精神的安全圏", shortLabel: "SAN", diceFamily: "3D6x5", betaScale: 0.30,
        highTag: "安全圏維持", lowTag: "深度受容",
        highDescription: "重い展開でも、納得・回復可能性・心理的な距離を残すことを重視します。",
        lowDescription: "不可逆的な喪失や価値観の崩壊を、強い物語体験として受け入れる傾向があります。"
    },
    {
        id: "LUCK", sourceAxis: "LUCK", label: "偶然委任性", shortLabel: "幸運", diceFamily: "3D6x5", betaScale: 0.26,
        highTag: "偶然委任", lowTag: "結果制御",
        highDescription: "ダイスや未知の確率へ結果を委ね、予定外の展開を物語として受け入れます。",
        lowDescription: "準備・推論・手順によって不確実性を下げ、結果を制御しようとします。"
    }
];
const THREE_D6_COUNTS = [1, 3, 6, 10, 15, 21, 25, 27, 27, 25, 21, 15, 10, 6, 3, 1];
const TWO_D6_COUNTS = [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1];
function erfApprox(value) {
    const sign = value < 0 ? -1 : 1;
    const x = Math.abs(value);
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
}
function normalCdf(z) {
    return 0.5 * (1 + erfApprox(z / Math.SQRT2));
}
function clampPercentile(value) {
    return Math.min(0.999, Math.max(0.001, value));
}
function diceTable(family) {
    if (family === "2D6+6") {
        return TWO_D6_COUNTS.map((count, index) => ({ value: index + 8, count, total: 36 }));
    }
    if (family === "3D6+3") {
        return THREE_D6_COUNTS.map((count, index) => ({ value: index + 6, count, total: 216 }));
    }
    if (family === "3D6x5") {
        return THREE_D6_COUNTS.map((count, index) => ({ value: (index + 3) * 5, count, total: 216 }));
    }
    return THREE_D6_COUNTS.map((count, index) => ({ value: index + 3, count, total: 216 }));
}
function percentileToDice(percentile, family) {
    const table = diceTable(family);
    let cumulative = 0;
    for (const item of table) {
        cumulative += item.count / item.total;
        if (percentile <= cumulative) {
            return { value: item.value, probability: item.count / item.total };
        }
    }
    const last = table.at(-1);
    return { value: last.value, probability: last.count / last.total };
}
export function getAbilityResults(state) {
    return ABILITY_META.map((meta) => {
        const theta = estimateTheta(state, meta.sourceAxis);
        const rawPercentile = normalCdf(theta / meta.betaScale);
        const percentile = clampPercentile(meta.id === "SAN" ? 1 - rawPercentile : rawPercentile);
        const converted = percentileToDice(percentile, meta.diceFamily);
        return {
            ...meta,
            theta,
            percentile,
            value: converted.value,
            theoreticalProbability: converted.probability,
            tendency: percentile >= 0.5 ? "high" : "low",
            distinctiveness: Math.abs(percentile - 0.5)
        };
    });
}
export function getDistinctiveAbilities(results, count = 2) {
    return [...results].sort((left, right) => right.distinctiveness - left.distinctiveness).slice(0, count);
}
export function buildProfileTitle(results) {
    const [first, second] = getDistinctiveAbilities(results, 2);
    if (!first || !second)
        return "選択の痕跡が残る探索者";
    const firstTag = first.tendency === "high" ? first.highTag : first.lowTag;
    const secondTag = second.tendency === "high" ? second.highTag : second.lowTag;
    return `「${firstTag} × ${secondTag}」の探索者`;
}
export function buildProfileSummary(results) {
    const [first, second] = getDistinctiveAbilities(results, 2);
    if (!first || !second)
        return "あなたの選択から、複数の行動傾向が観測されました。";
    const firstText = first.tendency === "high" ? first.highDescription : first.lowDescription;
    const secondText = second.tendency === "high" ? second.highDescription : second.lowDescription;
    return `${firstText} ${secondText}`;
}
export function abilityById(results, id) {
    const found = results.find((item) => item.id === id);
    if (!found)
        throw new Error(`Ability ${id} not found`);
    return found;
}
export function allDiagnosticAxes() {
    return DIAGNOSTIC_AXES;
}
//# sourceMappingURL=ability.js.map
import { SCENE_GUIDES } from "./sceneGuides.js";
import type { AppState, MeasurementSlotId } from "./types.js";

function hasClue(state: AppState, clue: string): boolean {
  return state.story.clues.includes(clue);
}

function hasFlag(state: AppState, flag: string): boolean {
  return state.story.flags.includes(flag);
}

/**
 * そのScene開始時点でPCが実際に取得済みの知識だけを補足する。
 * SCENE_GUIDES側には、ルートを問わずその場で観察できる事実だけを書く。
 */
export function getSceneKnownFacts(state: AppState, slotId: MeasurementSlotId): string[] {
  const facts = [...SCENE_GUIDES[slotId].knownFacts];
  const add = (fact: string) => {
    if (!facts.includes(fact)) facts.push(fact);
  };

  switch (slotId) {
    case "M02":
      if (hasClue(state, "sumie_corner_testimony")) add("澄江は、冬城が夜中に建物の角を漆喰で埋めていたと証言している。");
      if (hasClue(state, "eggshell_shelter")) add("大学資料では、この建物に卵殻状の曲面区画が設計されていた。");
      if (hasClue(state, "giant_angle_map")) add("玄関の金属枠の向きは、事前に調べた他施設との配置と一致している。");
      break;

    case "M05":
      if (hasClue(state, "old_floor_plan")) add("手元の旧図面では、二階北側の線だけが何度も引き直されている。");
      if (hasClue(state, "hidden_room_measurement")) add("外寸と現場測定の差から、壁内に空間がある可能性はすでに高い。");
      break;

    case "L03":
      if (hasClue(state, "normalized_clock_in_curve")) add("これまでに通った曲面区画では、時計のずれと角付近の異常が弱まった。");
      if (hasClue(state, "inhuman_tracks")) add("青黒い液体の近くでは、人間の靴跡と一致しない痕跡も確認している。");
      break;

    case "M07":
      if (hasClue(state, "phase_waveform")) add("異常音声では、通常の録音に対して十七分の時刻差が繰り返し確認されている。");
      break;

    case "M10":
      if (hasFlag(state, "phase_cycle_understood")) add("ここまでの異常には、十七分のずれが繰り返し現れている。");
      break;

    case "S01":
      if (hasClue(state, "observer_reaction_rule")) add("別の自分との接触では、こちらが情報を与えるほど相手の反応も変化した。");
      if (hasClue(state, "safe_exit_route")) add("別の自分から得た経路情報の一部は、実際の建物構造と一致していた。");
      break;

    case "M08":
      if (state.observer.angleNetworkState === "suspected" || state.observer.angleNetworkState === "mapped") {
        add("事前調査では、冬城が雨声荘以外にも三棟を改修していたことが分かっている。");
      }
      if (hasClue(state, "hound_name_tindalos")) add("補助観測の記録中に『Tindalos』という語が残っていたが、意味はまだ確定していない。");
      break;

    case "M12":
      if (hasClue(state, "temporary_door_cycle")) add("扉の出現には一定の周期があることをすでに記録している。");
      if (state.story.inventory.includes("metal_tag")) add("手元の金属片は、扉の輪郭が現れると同時に細かく振動する。");
      break;

    case "M14":
      if (hasClue(state, "fuyushiro_shutdown_notes")) add("冬城の停止記録には、発振器・鏡列・非常電源を扱う順序が残されている。");
      if (state.mythos.houndStage >= 2) add("角の奥の影は、すでにこちらの移動へ反応している。");
      break;

    case "S04":
      if (hasClue(state, "kuramochi_pre_observation_memory")) add("倉持の記録には、異常が始まる前までは一致する記憶が残っている。");
      if (state.mythos.houndStage >= 2) add("記録の複数箇所に、同じ細長い影が繰り返し映り込んでいる。");
      break;

    case "M13":
      if (state.observer.angleNetworkState === "mapped") add("四棟の位置・周波数・金属部材の向きは、ひとつの構造として対応している。");
      break;

    case "M16":
      if (hasClue(state, "kuramochi_shared_physiology")) add("記録上、三人は異常発生前まで同じ負傷・生理反応・所持品を共有している。");
      if (state.observer.angleNetworkState === "mapped" || state.observer.angleNetworkState === "warned") add("四棟をつなぐ回路の位置は特定済みで、現地から遮断操作を試せる。");
      break;

    case "S03":
      if (state.kuramochi.firstInformationSource === "A") add("最初に詳しく確認したAは、観測器と冬城の記録について多くを知っていた。");
      if (state.kuramochi.firstInformationSource === "B") add("最初に詳しく確認したBは、身体の連続性と出口について多くを知っていた。");
      if (state.kuramochi.firstInformationSource === "C") add("最初に詳しく確認したCは、榊への救援と共有記憶について多くを知っていた。");
      break;

    default:
      break;
  }

  return facts;
}

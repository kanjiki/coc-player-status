import type { AppState, KuramochiVariantId, MeasurementSlotId } from "./types.js";

function lastChoice(state: AppState): string {
  return state.history.at(-1)?.selectedChoiceId ?? "";
}

function hasFlag(state: AppState, flag: string): boolean {
  return state.story.flags.includes(flag);
}

function fixedName(id: KuramochiVariantId | null): string {
  return id ? `倉持${id}` : "倉持";
}

/**
 * 前Sceneの帰結を、次SceneのKP読み上げ冒頭へつなぐ短い文章。
 * ここでは新しい事実を作らず、AppStateへ既に記録された結果だけを読む。
 */
export function getReadAloudTransition(state: AppState): string {
  if (state.history.length === 0) return "";
  const current = state.story.currentSlot as MeasurementSlotId;
  const choice = lastChoice(state);

  switch (current) {
    case "M01": {
      const byChoice: Record<string, string> = {
        M03_quick_copy: "削除警告が消える前に、音声ファイルの複製が端末へ保存される。榊が車の鍵を手に取る横で、あなたはそのコピーを解析ソフトへ読み込んだ。",
        M03_formal_log: "管理者から正式ログが届く。送信経路とサーバー時刻に異常はない。問題の音声だけを抜き出し、解析ソフトへ読み込む。",
        M03_parallel: "音声の複製を終え、ログ保全の依頼も送信した。返答を待つあいだに、手元へ残した音声を解析ソフトへ読み込む。",
        M03_colleague: "倉持の同僚から予備録音が送られてくる。元のファイルと聞き比べるため、二つの音声を解析ソフトへ並べる。"
      };
      return byChoice[choice] ?? "";
    }

    case "M06": {
      if (choice === "M01_ask_sakaki") return "榊から言葉の意味を聞き終えると、彼女は机の引き出しから雨声荘に関する資料をいくつか取り出した。";
      if (choice === "M01_analyze_phase") return "解析結果を保存する。十七分のずれを画面に残したまま、榊が雨声荘に関する資料を机へ並べた。";
      if (choice === "M01_joint_review") return "二人で分離音声を聞き終える。榊は一度だけスピーカーを見返してから、雨声荘に関する資料を机へ並べた。";
      if (choice === "M01_preserve_only") return "音声を未加工のまま保存し、現地で照合することにする。榊が出発前に確認できる資料を机へ並べた。";
      return "";
    }

    case "M02": {
      switch (state.story.routes.lead) {
        case "sumie": return "須藤澄江を乗せた車が雨声荘の前で止まる。建物を見上げた澄江は、玄関へ目を向けたまま足を止めた。";
        case "records": return "大学で確認した改修資料を携え、雨声荘へ到着する。紙面に描かれていた曲面構造と、目の前の玄関が重なる。";
        case "network": return "四棟の配置を示す地図を端末に残したまま、雨声荘へ到着する。玄関の金属枠は、地図上で他施設へ伸ばした線と同じ方向を向いている。";
        case "immediate": return "寄り道をせず雨声荘へ向かったため、玄関前にはまだ新しい濡れた足跡が残っている。足跡は建物の中へ続いていた。";
        default: return "";
      }
    }

    case "L02": {
      switch (state.story.routes.entry) {
        case "preserve": return "正面の封鎖を崩さず、保守用の丸いハッチから建物内へ入る。曲面の短い通路を抜けると、一階廊下へ出た。";
        case "force": return "砕いた封鎖の隙間を抜け、建物内へ入る。背後では露出した金属枠の角から、青黒い煙がまだ細く漏れている。";
        case "limited": return "人一人分だけ開けた隙間を身体を横にして抜ける。支えに残した曲面パネルの向こうで、玄関の封鎖はかろうじて形を保っている。";
        case "call": return "外からの呼びかけに返った声は、複数の角へ遅れて散っていった。その反響を聞きながら既存の開口部から一階廊下へ入る。";
        default: return "";
      }
    }

    case "M05": {
      if (state.story.clues.includes("old_floor_plan")) {
        return "管理室を離れ、手に入れた古い図面を廊下で広げる。現在の壁までの距離を測り直すと、紙の上の数字と現物が噛み合わない。";
      }
      if (hasFlag(state, "management_lock_damaged") || hasFlag(state, "management_room_unopened")) {
        return "管理室から図面を持ち出すことはできなかった。そこで建物の外寸と、廊下で実際に測った距離だけを照合していく。";
      }
      return "管理室で得た情報と現場の寸法を照合しながら、二階北側へ上がる。";
    }

    case "M09": {
      const byChoice: Record<string, string> = {
        M05_records: "改修記録に残された部屋の位置を頼りに、二階北側の壁へ向かう。塗り潰された部屋番号と同じ位置で足を止めた。",
        M05_infer: "反響と温度差から絞り込んだ壁面へ印を付け、その場所まで移動する。",
        M05_overlay: "図面と測定値を重ねて出した輪郭を、実際の壁へ写していく。入口候補の前で測定器を止めた。",
        M05_tap_walls: "叩いた音が最も深く返った壁面へ戻る。そこだけ、廊下の空気がわずかに冷たい。"
      };
      return byChoice[choice] ?? "";
    }

    case "M11": {
      const byChoice: Record<string, string> = {
        M09_talk: "壁越しの会話を打ち切り、地下へ続く廊下へ移動する。背後では、先ほど覚えたこちらの声が別の角から小さく繰り返されている。",
        M09_break_wall: "壁の中から回収した録音機と血の付いた工具を持ち、地下へ続く廊下へ移動する。開けた壁は無人のまま背後へ遠ざかる。",
        M09_signal_then_open: "声と位置が一致しないことを確認し、録音機だけを回収して先へ進む。移動しても倉持の声は別の壁から追ってくる。",
        M09_disable_local_system: "配線を止めると壁の声は消えた。だが一階下から同じ声が再生される。その音を追うように地下側の廊下へ向かう。"
      };
      return byChoice[choice] ?? "";
    }

    case "M04": {
      if (choice === "M11_send_out") return "同行者を曲面空間へ退避させる。以後の連絡は榊との通信だけに切り替え、あなたは一人で地下へ続く廊下を進む。";
      if (choice === "M11_assign_role") return "役割を確認した同行者が再び歩き出す。二人で地下へ続く廊下へ踏み込む。";
      if (choice === "M11_stop_and_support" || choice === "M11_brief_support") return "相手が再び移動できることを確認し、止めていた足を地下側へ向ける。";
      return "";
    }

    case "L03": {
      const byChoice: Record<string, string> = {
        M04_slip_through: "狭まる通路を抜けた直後、背後で壁がさらに折れ込む。戻り道が細くなったところで、前方の通路が二手に分かれた。",
        M04_force_open: "押し広げた廊下を抜ける。背後の裂けた接合部から小さな角がいくつも露出したまま、前方で道が二手に分かれる。",
        M04_brace: "組んだ支柱が廊下を支えているあいだに先へ進む。資材を残した背後から金属音が響き、前方で道が二手に分かれた。",
        M04_detour: "安定した保守通路を迂回し、再び地下の主経路へ合流する。そこから先は二つの道に分かれている。"
      };
      return byChoice[choice] ?? "";
    }

    case "M07": {
      if (hasFlag(state, "shortcut_fall")) return "崩落した近道を抜ける途中で足場が崩れた。負傷した同行者を立たせ、瓦礫の向こう側へ出る。そこから先は、古い地下通路が一本続いている。";
      switch (state.story.routes.basement) {
        case "shortcut": return "崩落した近道を抜け、瓦礫の向こう側へ出る。青黒い液体の跡は途中で角へ消えた。";
        case "curved_slope": return "長い曲面スロープを下りきる。正常に進んでいた時計が、直線的な地下通路へ戻った瞬間にわずかに針を跳ねさせた。";
        case "reinforced": return "補強した近道を下りきり、ロープを外す。背後の瓦礫が小さく震える音を聞きながら地下通路へ出る。";
        case "maintenance": return "変形の周期を待って現れた保守通路を抜ける。通路が背後で閉じる直前、地下区画へ足を踏み入れた。";
        default: return "";
      }
    }

    case "M10": {
      switch (state.story.routes.echo) {
        case "follow": return "自分の声を追って入った予定外の部屋は、壁も床も二重にずれている。その重なりの向こうに、こちらと同じ姿が立っていた。";
        case "keep_plan": return "未来の声を背後へ残し、予定していた通路を進む。旧洗濯室の曇った鏡へ灯りを向けたとき、鏡の中の自分だけが一拍遅れて顔を上げた。";
        case "limited_follow": return "付けておいた目印の範囲まで引き返す。そこだけ空間が薄く二重になり、その向こう側をもう一人の自分が歩いている。";
        case "seal": return "封じた声を記録した機器が、触れていないのに再生を始める。画面の中には音声波形ではなく、こちらと同じ姿が映っている。";
        default: return "";
      }
    }

    case "S01": {
      if (choice === "M10_use_route") return "別の自分が示した経路だけを利用し、正体についての問いは残したまま観測室手前へ進む。";
      if (choice === "M10_test") return "問いへの反応を記録し終えると、別の自分の像は薄れていく。得られた規則を持って観測室手前へ進む。";
      if (choice === "M10_accept_dialogue" || choice === "M10_mixed") return "別の自分との会話を終え、示された方向へ進む。角を越えるたび、背後の気配がひとつ増えたように音だけが重なる。";
      return "";
    }

    case "M08": {
      if (state.mythos.houndStage >= 2) return "観測窓から離れても、角の奥にいた細長い影の気配は消えない。窓を背にし、近くの保管棚へ視線を移す。";
      if (choice === "S01_isolate") return "曲面材で補助窓を覆う。向こう側の像が隠れたところで、観測室前の保管棚へ向かう。";
      if (choice === "S01_destroy_record") return "破損した記録窓から離れる。砕けた縁に残った角を避け、観測室前の保管棚へ向かう。";
      return "観測窓で得た情報を残し、すぐ近くの保管棚へ移る。";
    }

    case "M12": {
      if (state.observer.angleNetworkState === "mapped") return "四棟を結ぶ線と金属部材の向きを記録し、倉持の捜索へ戻る。資料を閉じた直後、前方の壁に見覚えのない輪郭が浮かび始めた。";
      return "冬城の記録を閉じ、倉持のいる区画へ戻ろうとする。その途中、前方の壁に見覚えのない輪郭が浮かび始めた。";
    }

    case "L01": {
      switch (state.story.routes.transientDoor) {
        case "enter": return "別配置の廊下を進んだ先で、景色が一度だけ大きく揺れる。次に足を置いたとき、周囲は元の雨声荘へ戻っていた。目の前の床だけが、まだ一定の形を保っていない。";
        case "ignore": return "消えていく扉を背後へ残し、予定していた中央実験区画への経路を進む。ほどなく、床の継ぎ目が動いている場所へ出る。";
        case "probe": return "送り込んだカメラを回収し、別配置の記録だけを持って元の経路を進む。中央実験区画の手前で、床の継ぎ目が動き始める。";
        case "reproduce": return "扉の周期を記録し終えるころには、壁は元の姿へ戻っている。再現条件を残し、中央実験区画へ向かう。";
        default: return "";
      }
    }

    case "M15": {
      if (hasFlag(state, "floor_shifted_underfoot") || hasFlag(state, "marker_route_shifted")) return "変形する床をどうにか渡りきる。背後で床板が再びずれ、戻り道の形を変えたところで、三方を壁に囲まれた区画へ出る。";
      return "変形する床を越え、中央実験区画のさらに奥へ進む。やがて三方を壁に囲まれた行き止まりへ出る。";
    }

    case "M14": {
      const byChoice: Record<string, string> = {
        M15_infer_room: "反響の起点として特定した壁の先へ進み、観測室へ入る。",
        M15_break_strongest: "開いた壁の隙間から青黒い煙が漏れる。その向こうへ身体を滑り込ませると、観測室が現れる。",
        M15_test_then_open: "試験した壁面を必要な幅だけ開き、できた通路から観測室へ入る。",
        M15_use_blueprint_route: "図面で見つけた保守用ハッチを抜け、鏡列の裏側から観測室へ入る。"
      };
      return byChoice[choice] ?? "";
    }

    case "S04": {
      if (state.mythos.houndStage >= 2) return "観測窓から離れても、角の奥に見えた影は完全には消えない。装置のそばで音が一度鳴るたび、別の角へ細い影が移る。その状態のまま、倉持の記録装置を起動する。";
      if (choice === "M14_isolate_section") return "観測窓を曲面材で覆い、漏出をいったん弱める。確保した時間を使い、倉持の記録装置へ向かう。";
      return "観測窓への対応を終え、室内に残された倉持の記録装置へ向かう。";
    }

    case "M13": {
      if (choice === "S04_full_record") return "三つの記録を最後まで再生し終えた瞬間、装置の表示が一斉に乱れる。";
      if (choice === "S04_fragments") return "断片の照合を終え、A・B・Cの分岐を整理したところで、建物全体に振動が走る。";
      if (choice === "S04_rescue_only") return "救出条件だけを抜き出し、再生装置を閉じる。その直後、雨声荘全体が大きく軋んだ。";
      if (choice === "S04_discard_record") return "記録を閉じる操作を終えた直後、雨声荘全体が大きく軋んだ。";
      return "";
    }

    case "M16": {
      if (choice === "M13_evacuate") return "人物と証拠を球殻型退避槽へ移し終える。榊との通信をつないだまま観測室へ戻ると、中央の像と壁内の振動はまだ続いている。";
      if (choice === "M13_warn_network") return "他三施設へ停止指示を送り終える。返信を待ちながら観測室へ戻ると、壁内の振動が四方へ伸びているのが分かる。";
      if (choice === "M13_local_now") return "露出した角への応急封鎖を終え、観測室へ戻る。局所の煙は減ったが、壁内の振動は止まっていない。";
      if (choice === "M13_auto_warning") return "最低限の封鎖と警告を並行して済ませ、観測室へ戻る。どの処理も途中のまま、中央の装置は動き続けている。";
      return "";
    }

    case "L04": {
      switch (state.story.routes.finalScope) {
        case "rescue": return "広域回路を後回しにし、倉持の救出へ手を伸ばす。観測室中央の三つの時間状態へ声をかける。";
        case "network": return "四棟回路の遮断に時間を使い、観測室へ戻る。残された猶予の中で、倉持について詳しく確認できるのは限られている。";
        case "both": return "救出と回路遮断を並行したため、観測室中央の三つの像が不規則に入れ替わっている。声をかけても返事が重なった。";
        case "local": return "雨声荘の再封鎖を始める前に、観測室中央を確認する。完全に閉じれば倉持の状態を確かめる機会は失われる。";
        default: return "";
      }
    }

    case "S03": {
      const source = state.kuramochi.firstInformationSource;
      if (source === "A") return "最初に詳しく話を聞いたAの声が、他の二人より先にはっきり聞こえる。だが制御盤には、三つの状態すべてが同じ倉持から分かれたものとして表示されている。";
      if (source === "B") return "最初に詳しく確認したBは、三人の中で最も輪郭が安定している。だが制御盤には、三つの状態すべてが同じ倉持から分かれたものとして表示されている。";
      if (source === "C") return "最初に詳しく話を聞いたCは、榊の端末へ何度も視線を向けている。だが制御盤には、三つの状態すべてが同じ倉持から分かれたものとして表示されている。";
      return "";
    }

    case "S02": {
      if (state.kuramochi.multipleFixation || hasFlag(state, "single_fixation_safety_removed")) {
        return "安全機構を解除した瞬間、複数の倉持の輪郭が同時に現実側へ固定される。直後、室内のすべての角から青黒い煙が噴き出した。煙の奥で、細長い四肢を持つ影が完全な輪郭を結ぶ。装置を止める前に、追跡者までこちら側へ出てきた。";
      }
      if (hasFlag(state, "no_kuramochi_fixed") || state.kuramochi.state === "unfixed") {
        return "固定を行わないまま封鎖手順へ移る。A、B、Cの輪郭は観測窓の向こうへ少しずつ遠ざかり、声だけが数秒遅れて残る。最後の一人の姿が薄れたところで、制御盤が最終工程へ切り替わった。";
      }
      if (state.kuramochi.fixedVariant) {
        return `${fixedName(state.kuramochi.fixedVariant)}の輪郭だけが現在側へ残る。残る二つの像は薄くなり、声も届かなくなる。固定表示が安定したところで、制御盤が最終工程へ切り替わった。`;
      }
      return "";
    }

    default:
      return "";
  }
}

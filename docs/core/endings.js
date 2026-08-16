export const ENDINGS = {
    ENDING_A_ANGLELESS_MORNING: {
        id: "ENDING_A_ANGLELESS_MORNING",
        title: "Ending A――角のない朝",
        summary: "倉持は一つの時間状態へ安定して戻り、観測器・非常電源・四棟回路は停止した。猟犬は人物を特定する前に時間信号を失い、救出されなかった時間状態は音声からも消える。"
    },
    ENDING_B_DIFFERENT_YESTERDAY: {
        id: "ENDING_B_DIFFERENT_YESTERDAY",
        title: "Ending B――違う昨日を持つ男",
        summary: "倉持は帰還したが、記憶・負傷・榊との関係の一部が現実と一致しない。肉体はここにいるものの、どの時間状態を固定したのか確証が残らない。"
    },
    ENDING_C_EGGSHELL_PRISON: {
        id: "ENDING_C_EGGSHELL_PRISON",
        title: "Ending C――卵殻の檻",
        summary: "誰も本物として選ばず、三つの倉持を観測室ごと曲面封鎖した。外部への異常は止まったが、卵殻の内部から三人の声が同時に聞こえ続ける。"
    },
    ENDING_D_PURSUIT_CONTINUES: {
        id: "ENDING_D_PURSUIT_CONTINUES",
        title: "Ending D――追跡は終わらない",
        summary: "雨声荘と観測器の処理には成功しても、猟犬はすでに人物の時間的な匂いを得ている。事件後も角のある部屋、写真、時計に十七分の異常が現れる。"
    },
    ENDING_E_NOT_ONE_BUILDING: {
        id: "ENDING_E_NOT_ONE_BUILDING",
        title: "Ending E――一軒ではない",
        summary: "他三施設への警告または部分遮断には成功した。しかし雨声荘の処理は不完全で、四棟を越える時角回路の可能性が残る。"
    },
    ENDING_F_MULTIPLE_UNCHOSEN: {
        id: "ENDING_F_MULTIPLE_UNCHOSEN",
        title: "Ending F――選ばれなかった全員",
        summary: "複数の倉持が同時に帰還し、それぞれが異なる過去を主張する。三本以上の時間経路が現実へ残り、猟犬の完全標識は避けられない。"
    },
    ENDING_G_TOMORROWS_RECORDING: {
        id: "ENDING_G_TOMORROWS_RECORDING",
        title: "Ending G――明日からの録音",
        summary: "観測器・固定・回路・封鎖のどれかが不完全なまま事件は終わる。後日、回答者自身から十七分後に作成された音声が届く。『次は、その音声を分離するな』。"
    }
};
export function determineEnding(state) {
    if (state.kuramochi.multipleFixation) {
        return ENDINGS.ENDING_F_MULTIPLE_UNCHOSEN;
    }
    if (state.mythos.houndStage >= 2) {
        return ENDINGS.ENDING_D_PURSUIT_CONTINUES;
    }
    const observerContained = ["stopped", "resealed"].includes(state.observer.state);
    const networkContained = ["severed", "contained"].includes(state.observer.angleNetworkState);
    const powerStopped = state.observer.emergencyPowerState === "stopped";
    const curvedExit = state.story.flags.includes("curved_exit_used");
    if (state.kuramochi.fixedVariant &&
        state.kuramochi.fixationStability >= 3 &&
        observerContained &&
        networkContained &&
        powerStopped &&
        curvedExit) {
        return ENDINGS.ENDING_A_ANGLELESS_MORNING;
    }
    if (state.kuramochi.fixedVariant && state.kuramochi.fixationStability < 3) {
        return ENDINGS.ENDING_B_DIFFERENT_YESTERDAY;
    }
    if (!state.kuramochi.fixedVariant &&
        !state.kuramochi.multipleFixation &&
        state.observer.state === "resealed" &&
        networkContained) {
        return ENDINGS.ENDING_C_EGGSHELL_PRISON;
    }
    if (["mapped", "warned", "partially_severed"].includes(state.observer.angleNetworkState)) {
        return ENDINGS.ENDING_E_NOT_ONE_BUILDING;
    }
    return ENDINGS.ENDING_G_TOMORROWS_RECORDING;
}
//# sourceMappingURL=endings.js.map
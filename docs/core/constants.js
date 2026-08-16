export const MEASUREMENT_ORDER = [
    "M03", "M01", "M06", "M02", "L02",
    "M05", "M09", "M11", "M04", "L03",
    "M07", "M10", "S01", "M08", "M12", "L01",
    "M15", "M14", "S04", "M13", "M16", "L04",
    "S03", "S02"
];
export const DIAGNOSTIC_AXES = [
    "STR", "CON", "SIZ", "DEX", "APP",
    "INT", "POW", "EDU", "SAN_DEPTH", "LUCK"
];
export const CLUE_REGISTRY = {
    // 観測器停止・電源
    quick_audio_copy: "一時サーバーから複製した音声",
    formal_server_log: "正式な送信・監査ログ",
    phase_waveform: "十七分ずれた第二音声の波形",
    sakaki_private_phrase: "榊しか知らない私的な言葉",
    emergency_power_log: "午前3時17分の非常電源負荷試験記録",
    oscillator_map: "発振器と鏡列の連動図",
    fuyushiro_shutdown_notes: "冬城の停止手順",
    single_fixation_blueprint: "単一固定機構の図面",
    // 曲面封鎖
    sumie_corner_testimony: "冬城が角を埋めていたという澄江の証言",
    eggshell_shelter: "卵殻型避難室の存在",
    plaster_record: "曲面化改修の漆喰使用記録",
    corner_smoke: "角からだけ漏れる青黒い煙",
    shattered_mirror_log: "鏡を割ると漏出箇所が増えた記録",
    normalized_clock_in_curve: "曲面空間では時計が正常化する現象",
    // 倉持固定
    kuramochi_injury_continuity: "倉持固有の負傷の連続性",
    kuramochi_personal_item: "倉持の所持品",
    kuramochi_audio_match: "送信音声との一致",
    kuramochi_pre_observation_memory: "観測開始直前の記憶",
    kuramochi_shared_physiology: "三状態に共通する身体反応",
    kuramochi_sakaki_memory: "榊との共有記憶",
    // 四棟回路
    facility_locations: "他三施設の位置",
    orientation_distances: "四棟の方位と距離",
    metal_beam_directions: "金属角材の方向",
    shared_frequency: "四棟で一致する発振周波数",
    giant_angle_map: "四棟を結ぶ巨大角度図形",
    network_warning_channel: "他施設へ警告を送る通信経路",
    // 猟犬・時間角
    hound_name_tindalos: "冬城の文書に残されたTindalosの語",
    blue_ichor_sample: "角から漏れた青黒い液体",
    inhuman_tracks: "角の前で途切れる人間ではない痕跡",
    fuyushiro_disappearance: "冬城の失踪記録",
    curved_room_limit: "曲面空間は侵入を遅らせるだけという記録",
    observer_reaction_rule: "時角干渉観測器の反応規則",
    unchosen_self_testimony: "選ばなかった自分から得た証言",
    // 経路・現場
    old_floor_plan: "冬城改修前の図面",
    hidden_room_measurement: "図面にない空間の寸法推定",
    safe_exit_route: "曲面スロープを使う安全な出口",
    temporary_door_cycle: "一時的な扉の出現周期",
    structural_weak_point: "観測室封鎖壁の構造的弱点",
    observation_room_location: "本当の観測室の位置"
};
export const INVENTORY_REGISTRY = {
    audio_copy: "複製した音声ファイル",
    formal_log: "正式な監査ログ",
    old_blueprint: "改修前図面",
    rope: "ロープ",
    curved_panel_fragment: "曲面パネル片",
    recorder: "倉持の録音機",
    metal_tag: "別住所が刻まれた金属片",
    plaster_kit: "漆喰補修キット",
    remote_camera: "遠隔観測カメラ"
};
export const FIXATION_CLUES = new Set([
    "sakaki_private_phrase",
    "kuramochi_injury_continuity",
    "kuramochi_personal_item",
    "kuramochi_audio_match",
    "kuramochi_pre_observation_memory",
    "kuramochi_shared_physiology",
    "kuramochi_sakaki_memory"
]);
export const STOP_CLUES = new Set([
    "formal_server_log",
    "phase_waveform",
    "emergency_power_log",
    "oscillator_map",
    "fuyushiro_shutdown_notes",
    "single_fixation_blueprint"
]);
export const SEAL_CLUES = new Set([
    "sumie_corner_testimony",
    "eggshell_shelter",
    "plaster_record",
    "corner_smoke",
    "shattered_mirror_log",
    "normalized_clock_in_curve"
]);
export const NETWORK_CLUES = new Set([
    "facility_locations",
    "orientation_distances",
    "metal_beam_directions",
    "shared_frequency",
    "emergency_power_log",
    "giant_angle_map",
    "network_warning_channel"
]);
//# sourceMappingURL=constants.js.map
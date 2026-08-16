const DEFAULTS = {
    appName: "CoC探索者ステータス診断",
    scenarioTitle: "その角を曲がる前に",
    version: "1.1.0-beta.1",
    dataEndpoint: "",
    collectDiagnostics: false,
    shareUrl: "",
    rightsNotice: ""
};
export const APP_CONFIG = {
    ...DEFAULTS,
    ...(window.APP_CONFIG ?? {})
};
export function isRemoteCollectionEnabled() {
    return APP_CONFIG.collectDiagnostics && APP_CONFIG.dataEndpoint.trim().length > 0;
}
//# sourceMappingURL=config.js.map
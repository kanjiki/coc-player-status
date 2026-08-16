export interface AppConfig {
  appName: string;
  scenarioTitle: string;
  version: string;
  dataEndpoint: string;
  collectDiagnostics: boolean;
  shareUrl: string;
  rightsNotice: string;
}

declare global {
  interface Window {
    APP_CONFIG?: Partial<AppConfig>;
  }
}

const DEFAULTS: AppConfig = {
  appName: "CoC探索者ステータス診断",
  scenarioTitle: "その角を曲がる前に",
  version: "1.1.0-beta.1",
  dataEndpoint: "",
  collectDiagnostics: false,
  shareUrl: "",
  rightsNotice: ""
};

export const APP_CONFIG: AppConfig = {
  ...DEFAULTS,
  ...(window.APP_CONFIG ?? {})
};

export function isRemoteCollectionEnabled(): boolean {
  return APP_CONFIG.collectDiagnostics && APP_CONFIG.dataEndpoint.trim().length > 0;
}

const STORAGE_KEY = "coc-status-diagnosis:session:v1";
const SURVEY_KEY = "coc-status-diagnosis:survey:v1";
const SENT_KEY_PREFIX = "coc-status-diagnosis:sent:";
export function saveSession(session) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
    catch (error) {
        console.warn("診断状態を保存できませんでした", error);
    }
}
export function loadSession() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return null;
        const parsed = JSON.parse(raw);
        if (parsed.schemaVersion !== 1 || !parsed.state || !parsed.phase || !Array.isArray(parsed.snapshots)) {
            return null;
        }
        if (!parsed.startedAt)
            parsed.startedAt = parsed.updatedAt ?? new Date().toISOString();
        return parsed;
    }
    catch (error) {
        console.warn("保存済み診断を読み込めませんでした", error);
        return null;
    }
}
export function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
}
export function saveSurvey(survey) {
    localStorage.setItem(SURVEY_KEY, JSON.stringify(survey));
}
export function loadSurvey() {
    try {
        const raw = localStorage.getItem(SURVEY_KEY);
        return raw ? JSON.parse(raw) : null;
    }
    catch {
        return null;
    }
}
export function clearSurvey() {
    localStorage.removeItem(SURVEY_KEY);
}
export function markSessionSent(sessionSeed) {
    localStorage.setItem(`${SENT_KEY_PREFIX}${sessionSeed}`, new Date().toISOString());
}
export function wasSessionSent(sessionSeed) {
    return localStorage.getItem(`${SENT_KEY_PREFIX}${sessionSeed}`) !== null;
}
export function clearAllLocalData() {
    clearSession();
    clearSurvey();
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
        const key = localStorage.key(index);
        if (key?.startsWith(SENT_KEY_PREFIX))
            localStorage.removeItem(key);
    }
}
//# sourceMappingURL=storage.js.map
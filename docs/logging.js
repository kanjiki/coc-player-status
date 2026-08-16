async function postPayload(config, payload) {
    if (!config.collectDiagnostics || !config.dataEndpoint.trim())
        return false;
    try {
        const response = await fetch(config.dataEndpoint, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload),
            keepalive: true,
            mode: "cors"
        });
        return response.ok || response.type === "opaque";
    }
    catch (error) {
        console.warn("診断ログを送信できませんでした", error);
        return false;
    }
}
export function sendCompletedDiagnosis(config, state, ending, abilities) {
    return postPayload(config, {
        event: "diagnosis_completed",
        schemaVersion: 1,
        appVersion: config.version,
        coreVersion: "0.6.0",
        recordedAt: new Date().toISOString(),
        sessionId: state.sessionSeed,
        history: state.history,
        finalState: {
            story: state.story,
            observer: state.observer,
            mythos: state.mythos,
            kuramochi: state.kuramochi,
            diagnostic: state.diagnostic
        },
        ending,
        abilities: abilities.map((ability) => ({
            id: ability.id,
            value: ability.value,
            percentile: ability.percentile,
            theta: ability.theta
        }))
    });
}
export function sendOptionalSurvey(config, sessionId, survey) {
    return postPayload(config, {
        event: "optional_survey",
        schemaVersion: 1,
        appVersion: config.version,
        coreVersion: "0.6.0",
        recordedAt: new Date().toISOString(),
        sessionId,
        survey
    });
}
//# sourceMappingURL=logging.js.map
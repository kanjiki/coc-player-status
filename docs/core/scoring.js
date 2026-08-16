import { DIAGNOSTIC_AXES } from "./constants.js";
const MIN_VALID_RANGE = 0.75;
export function computeChoiceObservations(scene, visibleChoices, selectedChoice) {
    const axes = new Set();
    for (const choice of visibleChoices) {
        for (const axis of Object.keys(choice.diagnosticWeights)) {
            axes.add(axis);
        }
    }
    const observations = [];
    for (const axis of axes) {
        const values = visibleChoices.map((choice) => choice.diagnosticWeights[axis] ?? 0);
        const max = Math.max(...values);
        const min = Math.min(...values);
        const range = max - min;
        const primary = scene.primaryAxes.includes(axis);
        if (range < MIN_VALID_RANGE) {
            observations.push({
                axis,
                evidence: 0,
                informationWeight: 0,
                valid: false,
                primary
            });
            continue;
        }
        const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
        const scale = Math.max(...values.map((value) => Math.abs(value - mean)));
        const selectedValue = selectedChoice.diagnosticWeights[axis] ?? 0;
        const evidence = scale === 0 ? 0 : (selectedValue - mean) / scale;
        observations.push({
            axis,
            evidence: Math.max(-1, Math.min(1, evidence)),
            informationWeight: primary ? 1 : 0.5,
            valid: true,
            primary
        });
    }
    return observations;
}
export function computeResponseObservations(scene, visibleChoices, selectedChoice, responseMetadata) {
    const observations = computeChoiceObservations(scene, visibleChoices, selectedChoice);
    const overrides = responseMetadata && responseMetadata.kind !== "choice"
        ? responseMetadata.axisEvidence
        : undefined;
    if (!overrides)
        return observations;
    for (const [axis, rawEvidence] of Object.entries(overrides)) {
        if (!Number.isFinite(rawEvidence))
            continue;
        const evidence = Math.max(-1, Math.min(1, rawEvidence));
        const primary = scene.primaryAxes.includes(axis);
        const existing = observations.find((observation) => observation.axis === axis);
        if (existing) {
            existing.evidence = evidence;
            existing.informationWeight = primary ? 1 : 0.5;
            existing.valid = true;
            existing.primary = primary;
        }
        else {
            observations.push({
                axis,
                evidence,
                informationWeight: primary ? 1 : 0.5,
                valid: true,
                primary
            });
        }
    }
    return observations;
}
export function applyDiagnosticObservations(state, observations) {
    for (const observation of observations) {
        if (!observation.valid || observation.informationWeight <= 0) {
            continue;
        }
        const axisState = state.diagnostic[observation.axis];
        axisState.evidenceSum += observation.evidence * observation.informationWeight;
        axisState.informationSum += observation.informationWeight;
        axisState.validObservations += 1;
        if (observation.primary) {
            axisState.primaryObservations += 1;
        }
        axisState.evidenceHistory.push(observation.evidence);
    }
}
export function estimateTheta(state, axis, priorStrength = 2) {
    const axisState = state.diagnostic[axis];
    return axisState.evidenceSum / (priorStrength + axisState.informationSum);
}
export function estimateUncertainty(state, axis, priorStrength = 2) {
    const axisState = state.diagnostic[axis];
    return 1 / Math.sqrt(priorStrength + axisState.informationSum);
}
export function evidenceDispersion(state, axis) {
    const history = state.diagnostic[axis].evidenceHistory;
    if (history.length < 2) {
        return 0;
    }
    const mean = history.reduce((sum, value) => sum + value, 0) / history.length;
    const variance = history.reduce((sum, value) => sum + (value - mean) ** 2, 0) / history.length;
    return variance;
}
export function axesNeedingAdaptiveMeasurement(state) {
    return DIAGNOSTIC_AXES
        .filter((axis) => {
        const axisState = state.diagnostic[axis];
        return (axisState.primaryObservations < 4 ||
            estimateUncertainty(state, axis) > 0.42 ||
            (axisState.validObservations >= 4 && evidenceDispersion(state, axis) >= 0.7));
    })
        .sort((left, right) => {
        const leftState = state.diagnostic[left];
        const rightState = state.diagnostic[right];
        if (leftState.primaryObservations !== rightState.primaryObservations) {
            return leftState.primaryObservations - rightState.primaryObservations;
        }
        return estimateUncertainty(state, right) - estimateUncertainty(state, left);
    });
}
//# sourceMappingURL=scoring.js.map
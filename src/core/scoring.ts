import type {
  AppState,
  ChoiceDefinition,
  DiagnosticAxis,
  ResolvedScene
} from "./types.js";
import { DIAGNOSTIC_AXES } from "./constants.js";

const MIN_VALID_RANGE = 0.75;

export interface AxisObservation {
  axis: DiagnosticAxis;
  evidence: number;
  informationWeight: number;
  valid: boolean;
  primary: boolean;
}

export function computeChoiceObservations(
  scene: ResolvedScene,
  visibleChoices: readonly ChoiceDefinition[],
  selectedChoice: ChoiceDefinition
): AxisObservation[] {
  const axes = new Set<DiagnosticAxis>();
  for (const choice of visibleChoices) {
    for (const axis of Object.keys(choice.diagnosticWeights) as DiagnosticAxis[]) {
      axes.add(axis);
    }
  }

  const observations: AxisObservation[] = [];
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

export function applyDiagnosticObservations(
  state: AppState,
  observations: readonly AxisObservation[]
): void {
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

export function estimateTheta(state: AppState, axis: DiagnosticAxis, priorStrength = 2): number {
  const axisState = state.diagnostic[axis];
  return axisState.evidenceSum / (priorStrength + axisState.informationSum);
}

export function estimateUncertainty(state: AppState, axis: DiagnosticAxis, priorStrength = 2): number {
  const axisState = state.diagnostic[axis];
  return 1 / Math.sqrt(priorStrength + axisState.informationSum);
}

export function evidenceDispersion(state: AppState, axis: DiagnosticAxis): number {
  const history = state.diagnostic[axis].evidenceHistory;
  if (history.length < 2) {
    return 0;
  }
  const mean = history.reduce((sum, value) => sum + value, 0) / history.length;
  const variance = history.reduce((sum, value) => sum + (value - mean) ** 2, 0) / history.length;
  return variance;
}

export function axesNeedingAdaptiveMeasurement(state: AppState): DiagnosticAxis[] {
  return DIAGNOSTIC_AXES
    .filter((axis) => {
      const axisState = state.diagnostic[axis];
      return (
        axisState.primaryObservations < 4 ||
        estimateUncertainty(state, axis) > 0.42 ||
        (axisState.validObservations >= 4 && evidenceDispersion(state, axis) >= 0.7)
      );
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

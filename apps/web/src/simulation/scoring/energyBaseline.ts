import type { ActionType } from "../types";

export const BASELINE_FLOOR_J_PER_S = 5;

const ENERGY_BASELINE_TABLE: Record<ActionType, number> = {
  idle: 0,
  stand: 0,
  walk: 24.550234,
  squat: 11.217149,
  sit_to_stand: 0.655891,
  step: 14.962103,
};

export function getEnergyBaseline(action: ActionType, durationS: number): number {
  const duration = Math.max(durationS, 1 / 60);
  const perSecond = Math.max(ENERGY_BASELINE_TABLE[action], BASELINE_FLOOR_J_PER_S);
  return perSecond * duration;
}

export function getEnergyBaselinePerSecond(action: ActionType): number {
  return Math.max(ENERGY_BASELINE_TABLE[action], BASELINE_FLOOR_J_PER_S);
}

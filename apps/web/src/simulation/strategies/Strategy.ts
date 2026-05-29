import type { ActionTemplateId } from "../types";

export type StrategyLevel = 0 | 1 | 2 | 3 | 4 | 5;
export type StrategyKey = StrategyLevel | "bad_phase";

export interface StrategyJointAngles {
  leftHip: number;
  rightHip: number;
}

export interface StrategyJointVelocities {
  leftHip: number;
  rightHip: number;
}

export interface StrategyJointTorques {
  leftHip: number;
  rightHip: number;
}

export interface StrategyInput {
  q: StrategyJointAngles;
  dq: StrategyJointVelocities;
  q_ref: StrategyJointAngles;
  dq_ref: StrategyJointVelocities;
  tau_human: StrategyJointTorques;
  fatigue: number;
  action: ActionTemplateId;
  phase: number;
  t: number;
}

export interface Strategy {
  readonly id: string;
  readonly level: StrategyLevel;
  computeAssistTorque(input: StrategyInput): StrategyJointTorques;
  reset(): void;
}

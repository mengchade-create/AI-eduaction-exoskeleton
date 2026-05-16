import type { Strategy, StrategyInput, StrategyJointTorques } from "./Strategy";

const FULL_ALPHA_BASE = 0.65;
const FULL_ALPHA_PHASE_BONUS = 0.15;
const FULL_ALPHA_FATIGUE_BONUS = 0.2;
const FULL_ALPHA_MAX = 0.95;

export class Level5FullAdapt implements Strategy {
  readonly id = "level_5_full_adapt";
  readonly level = 5;

  computeAssistTorque(input: StrategyInput): StrategyJointTorques {
    const phaseWeight = 0.5 + 0.5 * Math.sin(2 * Math.PI * input.phase);
    const alpha = Math.min(
      FULL_ALPHA_MAX,
      FULL_ALPHA_BASE + FULL_ALPHA_PHASE_BONUS * phaseWeight + FULL_ALPHA_FATIGUE_BONUS * input.fatigue,
    );

    return {
      leftHip: alpha * input.tau_human.leftHip,
      rightHip: alpha * input.tau_human.rightHip,
    };
  }

  reset(): void {
    return;
  }
}

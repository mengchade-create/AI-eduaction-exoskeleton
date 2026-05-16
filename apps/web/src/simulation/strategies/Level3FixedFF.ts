import type { Strategy, StrategyInput, StrategyJointTorques } from "./Strategy";

const FIXED_FEEDFORWARD_ALPHA = 0.3;

export class Level3FixedFF implements Strategy {
  readonly id = "level_3_fixed_ff";
  readonly level = 3;

  computeAssistTorque(input: StrategyInput): StrategyJointTorques {
    return {
      leftHip: FIXED_FEEDFORWARD_ALPHA * input.tau_human.leftHip,
      rightHip: FIXED_FEEDFORWARD_ALPHA * input.tau_human.rightHip,
    };
  }

  reset(): void {
    return;
  }
}

import type { Strategy, StrategyInput, StrategyJointTorques } from "./Strategy";

const ZERO_TORQUE_NM = 0;

export class Level1Zero implements Strategy {
  readonly id = "level_1_zero";
  readonly level = 1;

  computeAssistTorque(_input: StrategyInput): StrategyJointTorques {
    void _input;

    return { leftHip: ZERO_TORQUE_NM, rightHip: ZERO_TORQUE_NM };
  }

  reset(): void {
    return;
  }
}

import type { Strategy, StrategyInput, StrategyJointTorques } from "./Strategy";

const PASSIVE_STIFFNESS_NM_PER_RAD = 4;
const PASSIVE_TORQUE_LIMIT_NM = 10;

export class Level2Passive implements Strategy {
  readonly id = "level_2_passive";
  readonly level = 2;

  computeAssistTorque(input: StrategyInput): StrategyJointTorques {
    return {
      leftHip: this.computeJointTorque(input.q.leftHip, input.q_ref.leftHip),
      rightHip: this.computeJointTorque(input.q.rightHip, input.q_ref.rightHip),
    };
  }

  reset(): void {
    return;
  }

  private computeJointTorque(q: number, qRef: number): number {
    return this.clamp(-PASSIVE_STIFFNESS_NM_PER_RAD * (q - qRef));
  }

  private clamp(torque: number): number {
    return Math.min(Math.max(torque, -PASSIVE_TORQUE_LIMIT_NM), PASSIVE_TORQUE_LIMIT_NM);
  }
}

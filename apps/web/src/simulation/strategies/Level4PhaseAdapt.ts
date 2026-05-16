import type { Strategy, StrategyInput, StrategyJointTorques } from "./Strategy";

const PHASE_ALPHA_BASE = 0.45;
const PHASE_ALPHA_SWING_BONUS = 0.2;

export class Level4PhaseAdapt implements Strategy {
  readonly id = "level_4_phase_adapt";
  readonly level = 4;

  computeAssistTorque(input: StrategyInput): StrategyJointTorques {
    const alpha = PHASE_ALPHA_BASE + PHASE_ALPHA_SWING_BONUS * this.swingWeight(input.phase);

    return {
      leftHip: alpha * input.tau_human.leftHip,
      rightHip: alpha * input.tau_human.rightHip,
    };
  }

  reset(): void {
    return;
  }

  private swingWeight(phase: number): number {
    return 0.5 + 0.5 * Math.sin(2 * Math.PI * phase);
  }
}

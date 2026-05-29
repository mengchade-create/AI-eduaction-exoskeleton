import type { Strategy, StrategyInput, StrategyJointTorques } from "./Strategy";

// Peak hip torque magnitude, Nm. Tuned to be comparable to Level 3's typical
// output magnitude so the comparison is fair (same effort, wrong timing).
const BAD_PHASE_PEAK_NM = 6;

// Half-cycle phase offset -- the defining property of this strategy.
const PHASE_OFFSET = 0.5;

/**
 * Adversarial strategy: applies a sinusoidal hip torque that is exactly one
 * half-cycle out of phase with the human's squat intent. During descent it
 * pushes toward extension; during ascent it pushes toward flexion. Symmetric
 * across both legs.
 *
 * Used as the "obviously wrong" reference point for demos and for the
 * monotonicity test that proves higher-level strategies actually help.
 */
export class BadPhase implements Strategy {
  readonly id = "bad_phase";
  readonly level = 0 as const;

  computeAssistTorque(input: StrategyInput): StrategyJointTorques {
    const shifted = (input.phase + PHASE_OFFSET) % 1;
    const tau = BAD_PHASE_PEAK_NM * Math.sin(2 * Math.PI * shifted);

    return { leftHip: tau, rightHip: tau };
  }

  reset(): void {
    return;
  }
}

import { deg2rad } from "../utils";

export interface IntentOutput {
  leftHipTargetPosRad: number;
  leftHipTargetVelRad: number;
  rightHipTargetPosRad: number;
  rightHipTargetVelRad: number;
}

export interface IntentConfig {
  speedScale: number;
  hipAmplitudeDeg: number;
}

export class HumanIntentModel {
  private cfg: IntentConfig = { speedScale: 1, hipAmplitudeDeg: 30 };

  setConfig(cfg: Partial<IntentConfig>): void {
    this.cfg = { ...this.cfg, ...cfg };
  }

  /**
   * walk: opposing sine waves, 30 degrees amplitude, 1 Hz.
   * stand: neutral.
   */
  compute(t: number, template: "stand" | "walk"): IntentOutput {
    if (template === "walk") {
      const amplitudeRad = deg2rad(this.cfg.hipAmplitudeDeg);
      const omega = 2 * Math.PI * this.cfg.speedScale;
      const phase = omega * t;
      const pos = amplitudeRad * Math.sin(phase);
      const vel = amplitudeRad * omega * Math.cos(phase);

      return {
        leftHipTargetPosRad: pos,
        leftHipTargetVelRad: vel,
        rightHipTargetPosRad: -pos,
        rightHipTargetVelRad: -vel,
      };
    }

    return {
      leftHipTargetPosRad: 0,
      leftHipTargetVelRad: 0,
      rightHipTargetPosRad: 0,
      rightHipTargetVelRad: 0,
    };
  }
}

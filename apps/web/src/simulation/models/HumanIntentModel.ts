import { deg2rad } from "../utils";
import type { ActionTemplateId } from "../types";

export const SQUAT_HIP_RANGE_DEG: [number, number] = [-5, 75];
export const STAND_HIP_DEG = 0;
export const WALK_HIP_AMPLITUDE_DEG = 25;
export const SIT_HIP_DEG = 85;
export const STEP_HIP_AMPLITUDE_DEG = 30;
export const SQUAT_FREQUENCY_HZ = 0.5;
export const SIT_TO_STAND_DURATION_S = 2;
export const STEP_COUNT = 4;
export const ACTION_BLEND_DURATION_S = 0.2;

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

type BlendSnapshot = IntentOutput;

export class HumanIntentModel {
  private cfg: IntentConfig = {
    speedScale: 1,
    hipAmplitudeDeg: WALK_HIP_AMPLITUDE_DEG,
  };
  private action: ActionTemplateId = "stand";
  private actionStartedAt = 0;
  private blendStartedAt = 0;
  private blendFrom: BlendSnapshot = this.neutralOutput();

  setConfig(cfg: Partial<IntentConfig>): void {
    this.cfg = { ...this.cfg, ...cfg };
  }

  beginAction(action: ActionTemplateId, t: number, blendFrom?: BlendSnapshot): void {
    this.blendFrom = blendFrom ?? this.rawCompute(t);
    this.action = action;
    this.actionStartedAt = t;
    this.blendStartedAt = t;
  }

  forceAction(action: ActionTemplateId, t: number): void {
    this.action = action;
    this.actionStartedAt = t;
    this.blendStartedAt = t - ACTION_BLEND_DURATION_S;
    this.blendFrom = this.rawCompute(t);
  }

  isBlending(t: number): boolean {
    return t - this.blendStartedAt < ACTION_BLEND_DURATION_S;
  }

  /**
   * walk: opposing sine waves, 30 degrees amplitude, 1 Hz.
   * stand: neutral.
   */
  compute(t: number): IntentOutput {
    const raw = this.rawCompute(t);
    const blendProgress = (t - this.blendStartedAt) / ACTION_BLEND_DURATION_S;

    if (blendProgress >= 1) {
      return raw;
    }

    return this.lerpOutput(this.blendFrom, raw, Math.max(0, blendProgress));
  }

  private rawCompute(t: number): IntentOutput {
    const elapsed = Math.max(0, t - this.actionStartedAt);

    if (this.action === "walk") {
      return this.opposingSine(t, this.cfg.hipAmplitudeDeg, 1 * this.cfg.speedScale);
    }

    if (this.action === "squat") {
      return this.synchronizedSquat(elapsed);
    }

    if (this.action === "sit_to_stand") {
      return this.sitToStand(elapsed);
    }

    if (this.action === "step") {
      return this.opposingSine(elapsed, STEP_HIP_AMPLITUDE_DEG, 1 * this.cfg.speedScale);
    }

    return this.neutralOutput();
  }

  private opposingSine(t: number, amplitudeDeg: number, frequencyHz: number): IntentOutput {
    const amplitudeRad = deg2rad(amplitudeDeg);
    const omega = 2 * Math.PI * frequencyHz;
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

  private synchronizedSquat(t: number): IntentOutput {
    const rangeDeg = SQUAT_HIP_RANGE_DEG[1] - SQUAT_HIP_RANGE_DEG[0];
    const baseRad = deg2rad(SQUAT_HIP_RANGE_DEG[0]);
    const amplitudeRad = deg2rad(rangeDeg / 2);
    const omega = 2 * Math.PI * SQUAT_FREQUENCY_HZ * this.cfg.speedScale;
    const phase = omega * t;
    const pos = baseRad + amplitudeRad * (1 - Math.cos(phase));
    const vel = amplitudeRad * omega * Math.sin(phase);

    return this.syncOutput(pos, vel);
  }

  private sitToStand(t: number): IntentOutput {
    const duration = SIT_TO_STAND_DURATION_S / this.cfg.speedScale;
    const clampedT = Math.min(t, duration);
    const u = duration === 0 ? 1 : clampedT / duration;
    const smooth = 10 * u ** 3 - 15 * u ** 4 + 6 * u ** 5;
    const smoothDerivative = 30 * u ** 2 - 60 * u ** 3 + 30 * u ** 4;
    const startRad = deg2rad(SIT_HIP_DEG);
    const endRad = deg2rad(STAND_HIP_DEG);
    const deltaRad = endRad - startRad;
    const pos = startRad + deltaRad * smooth;
    const vel = deltaRad * smoothDerivative / duration;

    return this.syncOutput(pos, vel);
  }

  private syncOutput(posRad: number, velRad: number): IntentOutput {
    return {
      leftHipTargetPosRad: posRad,
      leftHipTargetVelRad: velRad,
      rightHipTargetPosRad: posRad,
      rightHipTargetVelRad: velRad,
    };
  }

  sittingOutput(): IntentOutput {
    return this.syncOutput(deg2rad(SIT_HIP_DEG), 0);
  }

  private neutralOutput(): IntentOutput {
    return {
      leftHipTargetPosRad: deg2rad(STAND_HIP_DEG),
      leftHipTargetVelRad: 0,
      rightHipTargetPosRad: deg2rad(STAND_HIP_DEG),
      rightHipTargetVelRad: 0,
    };
  }

  private lerpOutput(from: IntentOutput, to: IntentOutput, progress: number): IntentOutput {
    return {
      leftHipTargetPosRad: this.lerp(from.leftHipTargetPosRad, to.leftHipTargetPosRad, progress),
      leftHipTargetVelRad: this.lerp(from.leftHipTargetVelRad, to.leftHipTargetVelRad, progress),
      rightHipTargetPosRad: this.lerp(from.rightHipTargetPosRad, to.rightHipTargetPosRad, progress),
      rightHipTargetVelRad: this.lerp(from.rightHipTargetVelRad, to.rightHipTargetVelRad, progress),
    };
  }

  private lerp(from: number, to: number, progress: number): number {
    return from + (to - from) * progress;
  }
}

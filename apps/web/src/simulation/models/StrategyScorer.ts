import type { ActionType, ScoreBreakdown, SubScore } from "../types";

export const SCORE_WEIGHT_TRACKING = 0.5;
export const SCORE_WEIGHT_SMOOTHNESS = 0.3;
export const SCORE_WEIGHT_ENDURANCE = 0.2;
export const HIP_ROM_LIMIT_RAD = (80 * Math.PI) / 180;
export const TRACKING_ERROR_DECAY = 3;
export const SMOOTHNESS_DECAY = 0.00002;

export const SCORE_WEIGHTS = {
  tracking: SCORE_WEIGHT_TRACKING,
  smoothness: SCORE_WEIGHT_SMOOTHNESS,
  endurance: SCORE_WEIGHT_ENDURANCE,
} as const;

export interface ScoreSample {
  leftPosRad: number;
  rightPosRad: number;
  leftRefPosRad?: number;
  rightRefPosRad?: number;
  leftVelRad: number;
  rightVelRad: number;
  leftTauHumanNm: number;
  rightTauHumanNm: number;
  leftTauExoNm: number;
  rightTauExoNm: number;
  fatigue: number;
  dt: number;
}

export interface ScoreWeights {
  tracking: number;
  smoothness: number;
  endurance: number;
}

export function weightedScoreTotal(subscores: SubScore[]): number {
  return subscores.reduce((total, subscore) => total + subscore.contribution, 0);
}

export class StrategyScorer {
  private energyHuman = 0;
  private energyExo = 0;
  private romViolation = 0;
  private smoothness = 0;
  private trackingErrorSq = 0;
  private staminaIntegral = 0;
  private fatigueFinal = 0;
  private duration = 0;
  private prevLeftTauExo = 0;
  private prevRightTauExo = 0;
  private weights: ScoreWeights;

  constructor(weights: ScoreWeights = SCORE_WEIGHTS) {
    this.weights = weights;
  }

  record(sample: ScoreSample): void {
    const leftRefPosRad = sample.leftRefPosRad ?? sample.leftPosRad;
    const rightRefPosRad = sample.rightRefPosRad ?? sample.rightPosRad;

    this.energyHuman +=
      (Math.abs(sample.leftTauHumanNm * sample.leftVelRad) +
        Math.abs(sample.rightTauHumanNm * sample.rightVelRad)) *
      sample.dt;
    this.energyExo +=
      (Math.abs(sample.leftTauExoNm * sample.leftVelRad) +
        Math.abs(sample.rightTauExoNm * sample.rightVelRad)) *
      sample.dt;
    this.romViolation +=
      (this.romOverflow(sample.leftPosRad) + this.romOverflow(sample.rightPosRad)) * sample.dt;
    this.trackingErrorSq +=
      (((sample.leftPosRad - leftRefPosRad) ** 2 + (sample.rightPosRad - rightRefPosRad) ** 2) / 2) *
      sample.dt;
    this.smoothness +=
      ((sample.leftTauExoNm - this.prevLeftTauExo) / sample.dt) ** 2 * sample.dt +
      ((sample.rightTauExoNm - this.prevRightTauExo) / sample.dt) ** 2 * sample.dt;
    this.prevLeftTauExo = sample.leftTauExoNm;
    this.prevRightTauExo = sample.rightTauExoNm;
    this.fatigueFinal = sample.fatigue;
    this.staminaIntegral += this.clamp01(1 - sample.fatigue) * sample.dt;
    this.duration += sample.dt;
  }

  finalScore(strategyId: string, durationS: number = this.duration, _action: ActionType = "idle"): ScoreBreakdown {
    void _action;

    const trackingRmse = this.duration > 0 ? Math.sqrt(this.trackingErrorSq / this.duration) : 0;
    const tracking = this.clamp01(Math.exp(-TRACKING_ERROR_DECAY * trackingRmse));
    const smoothness = this.clamp01(Math.exp(-SMOOTHNESS_DECAY * this.smoothness));
    // Empty episodes have perfect endurance so callers can stop safely before any frame is recorded.
    const endurance = this.duration > 0 ? this.clamp01(this.staminaIntegral / this.duration) : 1;
    const subscores = [
      this.subscore("tracking", "Tracking Accuracy", tracking, this.weights.tracking),
      this.subscore("smoothness", "Smoothness", smoothness, this.weights.smoothness),
      this.subscore("endurance", "Endurance Efficiency", endurance, this.weights.endurance),
    ];
    const total = weightedScoreTotal(subscores);

    return {
      total,
      subscores,
      breakdown: {
        energy_human: this.energyHuman,
        energy_exo: this.energyExo,
        rom_violation: this.romViolation,
        smoothness: this.smoothness,
        fatigue_final: this.fatigueFinal,
      },
      strategy_id: strategyId,
      duration_s: durationS,
    };
  }

  reset(): void {
    this.energyHuman = 0;
    this.energyExo = 0;
    this.romViolation = 0;
    this.smoothness = 0;
    this.trackingErrorSq = 0;
    this.staminaIntegral = 0;
    this.fatigueFinal = 0;
    this.duration = 0;
    this.prevLeftTauExo = 0;
    this.prevRightTauExo = 0;
  }

  private romOverflow(posRad: number): number {
    return Math.max(0, Math.abs(posRad) - HIP_ROM_LIMIT_RAD);
  }

  private subscore(key: string, label: string, value: number, weight: number): SubScore {
    return {
      key,
      label,
      value,
      weight,
      contribution: value * weight,
    };
  }

  private clamp01(value: number): number {
    return Math.min(1, Math.max(0, value));
  }
}

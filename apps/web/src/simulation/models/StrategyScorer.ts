import type { ScoreBreakdown } from "../types";

export const SCORE_WEIGHT_ENERGY = 100;
export const SCORE_WEIGHT_ROM = 8;
export const SCORE_WEIGHT_SMOOTHNESS = 0.00002;
export const SCORE_WEIGHT_FATIGUE = 10;
export const ENERGY_HUMAN_BASELINE = 230;
export const HIP_ROM_LIMIT_RAD = (80 * Math.PI) / 180;

export interface ScoreSample {
  leftPosRad: number;
  rightPosRad: number;
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
  energy: number;
  rom: number;
  smoothness: number;
  fatigue: number;
}

export class StrategyScorer {
  private energyHuman = 0;
  private energyExo = 0;
  private romViolation = 0;
  private smoothness = 0;
  private fatigueFinal = 0;
  private duration = 0;
  private prevLeftTauExo = 0;
  private prevRightTauExo = 0;
  private weights: ScoreWeights;

  constructor(weights: ScoreWeights = {
    energy: SCORE_WEIGHT_ENERGY,
    rom: SCORE_WEIGHT_ROM,
    smoothness: SCORE_WEIGHT_SMOOTHNESS,
    fatigue: SCORE_WEIGHT_FATIGUE,
  }) {
    this.weights = weights;
  }

  record(sample: ScoreSample): void {
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
    this.smoothness +=
      ((sample.leftTauExoNm - this.prevLeftTauExo) / sample.dt) ** 2 * sample.dt +
      ((sample.rightTauExoNm - this.prevRightTauExo) / sample.dt) ** 2 * sample.dt;
    this.prevLeftTauExo = sample.leftTauExoNm;
    this.prevRightTauExo = sample.rightTauExoNm;
    this.fatigueFinal = sample.fatigue;
    this.duration += sample.dt;
  }

  finalScore(strategyId: string, durationS: number = this.duration): ScoreBreakdown {
    const energyTerm = this.weights.energy * (1 - this.energyHuman / ENERGY_HUMAN_BASELINE);
    const total =
      energyTerm -
      this.weights.rom * this.romViolation -
      this.weights.smoothness * this.smoothness -
      this.weights.fatigue * this.fatigueFinal;

    return {
      total,
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
    this.fatigueFinal = 0;
    this.duration = 0;
    this.prevLeftTauExo = 0;
    this.prevRightTauExo = 0;
  }

  private romOverflow(posRad: number): number {
    return Math.max(0, Math.abs(posRad) - HIP_ROM_LIMIT_RAD);
  }
}

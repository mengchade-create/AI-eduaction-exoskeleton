import { describe, expect, it } from "vitest";

import { SCORE_WEIGHTS, StrategyScorer, weightedScoreTotal } from "../models/StrategyScorer";
import { getEnergyBaselinePerSecond } from "../scoring/energyBaseline";
import type { SubScore } from "../types";

const SAMPLE = {
  leftPosRad: 0.2,
  rightPosRad: -0.2,
  leftVelRad: 0.4,
  rightVelRad: -0.3,
  leftTauHumanNm: 10,
  rightTauHumanNm: -8,
  leftTauExoNm: 3,
  rightTauExoNm: -2,
  fatigue: 0.1,
  dt: 0.002,
};

function scoreTwice(): number {
  const scorer = new StrategyScorer();
  scorer.record(SAMPLE);
  scorer.record(SAMPLE);
  return scorer.finalScore("deterministic").total;
}

describe("StrategyScorer", () => {
  it("returns the same total for the same sample sequence", () => {
    expect(scoreTwice()).toBe(scoreTwice());
  });

  it("reports duration from accumulated simulation time", () => {
    const scorer = new StrategyScorer();
    const frameDt = 1 / 60;

    scorer.record({ ...SAMPLE, dt: frameDt });
    scorer.record({ ...SAMPLE, dt: frameDt });

    expect(scorer.finalScore("duration").duration_s).toBeCloseTo(2 * frameDt);
  });

  it("uses action-specific baseline table values", () => {
    expect(getEnergyBaselinePerSecond("walk")).not.toBe(getEnergyBaselinePerSecond("squat"));
  });

  it("computes total as the weighted sum of subscore contributions", () => {
    for (let i = 0; i < 20; i += 1) {
      const values = {
        tracking: ((i * 17) % 100) / 100,
        smoothness: ((i * 29 + 7) % 100) / 100,
        endurance: ((i * 43 + 11) % 100) / 100,
      };
      const subscores: SubScore[] = [
        {
          key: "tracking",
          label: "Tracking Accuracy",
          value: values.tracking,
          weight: SCORE_WEIGHTS.tracking,
          contribution: values.tracking * SCORE_WEIGHTS.tracking,
        },
        {
          key: "smoothness",
          label: "Smoothness",
          value: values.smoothness,
          weight: SCORE_WEIGHTS.smoothness,
          contribution: values.smoothness * SCORE_WEIGHTS.smoothness,
        },
        {
          key: "endurance",
          label: "Endurance Efficiency",
          value: values.endurance,
          weight: SCORE_WEIGHTS.endurance,
          contribution: values.endurance * SCORE_WEIGHTS.endurance,
        },
      ];

      expect(weightedScoreTotal(subscores)).toBeCloseTo(
        subscores.reduce((sum, subscore) => sum + subscore.value * subscore.weight, 0),
        9,
      );
    }
  });

  it("computes endurance efficiency as mean stamina", () => {
    const scorer = new StrategyScorer();

    scorer.record({ ...SAMPLE, fatigue: 0, dt: 1 });
    scorer.record({ ...SAMPLE, fatigue: 0.5, dt: 1 });
    scorer.record({ ...SAMPLE, fatigue: 1, dt: 1 });

    const endurance = scorer.finalScore("endurance").subscores.find((subscore) => subscore.key === "endurance");

    expect(endurance?.value).toBeCloseTo(0.5);
  });

  it("returns perfect endurance for an empty episode", () => {
    const scorer = new StrategyScorer();
    const endurance = scorer.finalScore("empty").subscores.find((subscore) => subscore.key === "endurance");

    expect(endurance?.value).toBe(1);
  });

  it("keeps the subscore key set stable", () => {
    const scorer = new StrategyScorer();
    const keys = scorer.finalScore("keys").subscores.map((subscore) => subscore.key);

    expect(keys).toEqual(["tracking", "smoothness", "endurance"]);
  });
});

import { describe, expect, it } from "vitest";

import { StrategyScorer } from "../models/StrategyScorer";

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
});

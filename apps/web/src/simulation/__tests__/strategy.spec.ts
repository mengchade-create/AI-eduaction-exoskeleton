import { afterEach, describe, expect, it, vi } from "vitest";

import { SimulationKernel } from "../SimulationKernel";
import { StrategyScorer } from "../models/StrategyScorer";
import { createStrategy } from "../strategies/StrategyFactory";
import type { StrategyInput, StrategyKey, StrategyLevel } from "../strategies/Strategy";

const ZERO_INPUT: StrategyInput = {
  q: { leftHip: 0.2, rightHip: -0.1 },
  dq: { leftHip: 0.1, rightHip: -0.1 },
  q_ref: { leftHip: 0.3, rightHip: -0.2 },
  dq_ref: { leftHip: 0, rightHip: 0 },
  tau_human: { leftHip: 12, rightHip: -8 },
  fatigue: 0.25,
  action: "walk",
  phase: 0.25,
  t: 1,
};

function runSquat(strategyKey: StrategyKey): number {
  vi.useFakeTimers();
  const kernel = new SimulationKernel({ seed: 42, initialStrategyLevel: strategyKey });
  kernel.playAction("squat");
  vi.advanceTimersByTime(12000);
  const score = kernel.stop();
  vi.useRealTimers();
  return score.total;
}

describe("strategy factory", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates five unique strategy ids with matching levels", () => {
    const strategies = [1, 2, 3, 4, 5].map((level) => createStrategy(level as StrategyLevel));
    const ids = new Set(strategies.map((strategy) => strategy.id));

    expect(ids.size).toBe(5);
    expect(strategies.map((strategy) => strategy.level)).toEqual([1, 2, 3, 4, 5]);
  });

  it("keeps level_1_zero torque exactly zero for arbitrary input", () => {
    const strategy = createStrategy(1);

    expect(strategy.computeAssistTorque(ZERO_INPUT)).toEqual({ leftHip: 0, rightHip: 0 });
  });

  it("creates a bad_phase strategy with id 'bad_phase' and level 0", () => {
    const strategy = createStrategy("bad_phase");

    expect(strategy.id).toBe("bad_phase");
    expect(strategy.level).toBe(0);
  });

  it("bad_phase outputs torque a half-cycle out of phase with the squat cycle", () => {
    const strategy = createStrategy("bad_phase");
    const out = strategy.computeAssistTorque({ ...ZERO_INPUT, phase: 0.25 });

    expect(out.leftHip).toBeLessThan(-0.1);
    expect(out.rightHip).toBeLessThan(-0.1);

    const out2 = strategy.computeAssistTorque({ ...ZERO_INPUT, phase: 0.75 });

    expect(out2.leftHip).toBeGreaterThan(0.1);
    expect(Math.sign(out.leftHip)).toBe(-Math.sign(out2.leftHip));
  });

  it("applies pending strategy changes on the next telemetry frame", () => {
    vi.useFakeTimers();
    const kernel = new SimulationKernel();
    const strategyIds: string[] = [];

    kernel.subscribe((frame) => {
      strategyIds.push(frame.strategy_id);
    });
    kernel.playAction("stand");
    kernel.setStrategy(3);
    vi.advanceTimersByTime(20);
    kernel.stop();

    expect(strategyIds).toContain("level_3_fixed_ff");
  });

  it("scores higher strategy levels monotonically for the same squat action", () => {
    const scores = [1, 2, 3, 4, 5].map((level) => runSquat(level as StrategyLevel));

    expect(scores[0]).toBeLessThanOrEqual(scores[1]);
    expect(scores[1]).toBeLessThanOrEqual(scores[2]);
    expect(scores[2]).toBeLessThanOrEqual(scores[3]);
    expect(scores[3]).toBeLessThanOrEqual(scores[4]);
    expect(scores[4]).toBeGreaterThan(scores[0]);
    expect(scores[4] - scores[3]).toBeGreaterThanOrEqual(0.5);
  });

  it("bad_phase scores worse than Level 1 zero on a full squat", () => {
    const zeroScore = runSquat(1);
    const badScore = runSquat("bad_phase");

    expect(badScore).toBeLessThan(zeroScore);
  });

  it("records ROM violation when hip angle exceeds the assumed limit", () => {
    const scorer = new StrategyScorer();

    scorer.record({
      leftPosRad: (90 * Math.PI) / 180,
      rightPosRad: 0,
      leftVelRad: 0,
      rightVelRad: 0,
      leftTauHumanNm: 0,
      rightTauHumanNm: 0,
      leftTauExoNm: 0,
      rightTauExoNm: 0,
      fatigue: 0,
      dt: 0.1,
    });

    expect(scorer.finalScore("test").breakdown.rom_violation).toBeGreaterThan(0);
  });
});

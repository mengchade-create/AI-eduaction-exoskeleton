import { afterEach, describe, expect, it, vi } from "vitest";

import { SimulationKernel } from "../SimulationKernel";
import {
  ACTION_BLEND_DURATION_S,
  HumanIntentModel,
  SIT_TO_STAND_DURATION_S,
  SQUAT_HIP_RANGE_DEG,
} from "../models/HumanIntentModel";
import { rad2deg } from "../utils";

const BLEND_MAX_DQREF_DEG_PER_S = 80;

describe("action templates", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs squat as an approximately two-second periodic template", () => {
    const intent = new HumanIntentModel();
    const maxHipDeg = SQUAT_HIP_RANGE_DEG[1];
    let nearMaxCount = 0;

    intent.beginAction("squat", 0);

    for (let i = 0; i <= 40; i += 1) {
      const sampleTime = i * 0.1;
      const hipDeg = rad2deg(intent.compute(sampleTime).leftHipTargetPosRad);

      if (Math.abs(hipDeg - maxHipDeg) <= 2) {
        nearMaxCount += 1;
      }
    }

    expect(nearMaxCount).toBeGreaterThanOrEqual(2);
  });

  it("moves sit_to_stand monotonically from sitting to standing", () => {
    const intent = new HumanIntentModel();
    const samples: number[] = [];

    intent.beginAction("sit_to_stand", 0, intent.sittingOutput());

    for (let i = 0; i <= 120; i += 1) {
      const sampleTime = (SIT_TO_STAND_DURATION_S * i) / 120;
      samples.push(rad2deg(intent.compute(sampleTime).leftHipTargetPosRad));
    }

    for (let i = 1; i < samples.length; i += 1) {
      expect(samples[i]).toBeLessThanOrEqual(samples[i - 1] + 1);
    }

    expect(Math.abs(samples[samples.length - 1])).toBeLessThan(1);
  });

  it("notifies exactly once when sit_to_stand completes", () => {
    vi.useFakeTimers();
    const kernel = new SimulationKernel();
    const completed: string[] = [];

    kernel.onActionComplete((action) => {
      completed.push(action);
    });
    kernel.playAction("sit_to_stand");
    vi.advanceTimersByTime(2500);
    kernel.stop();

    expect(completed).toEqual(["sit_to_stand"]);
  });

  it("notifies exactly once after the requested step count", () => {
    vi.useFakeTimers();
    const kernel = new SimulationKernel();
    const completed: string[] = [];

    kernel.onActionComplete((action) => {
      completed.push(action);
    });
    kernel.playAction("step", { stepCount: 3 });
    vi.advanceTimersByTime(5000);
    kernel.stop();

    expect(completed).toEqual(["step"]);
  });

  it("blends target velocity smoothly when switching from stand to squat", () => {
    const intent = new HumanIntentModel();
    let maxAbsVelocityDeg = 0;

    intent.forceAction("stand", 0);
    intent.beginAction("squat", 0);

    for (let i = 0; i <= 100; i += 1) {
      const sampleTime = (ACTION_BLEND_DURATION_S * i) / 100;
      const velocityDeg = Math.abs(rad2deg(intent.compute(sampleTime).leftHipTargetVelRad));
      maxAbsVelocityDeg = Math.max(maxAbsVelocityDeg, velocityDeg);
    }

    expect(maxAbsVelocityDeg).toBeLessThan(BLEND_MAX_DQREF_DEG_PER_S);
  });
});

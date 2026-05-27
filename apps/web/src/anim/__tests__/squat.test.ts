import { describe, expect, it } from "vitest";

import { PASSIVE_JOINT_LIMITS_RAD, type PassiveJointName } from "../../scene/passiveJoints";
import { squatTemplate } from "../templates/squat";

const DEG_TO_RAD = Math.PI / 180;
const passiveJointNames: PassiveJointName[] = ["leftKnee", "rightKnee", "leftAnkle", "rightAnkle"];

function expectNeutralFrame(t: number) {
  const frame = squatTemplate.sample(t);

  expect(frame.active.left_hip).toBe(0);
  expect(frame.active.right_hip).toBe(0);
  expect(frame.passive.leftKnee).toBe(0);
  expect(frame.passive.rightKnee).toBe(0);
  expect(frame.passive.leftAnkle).toBe(0);
  expect(frame.passive.rightAnkle).toBe(0);
  expect(frame.stance).toBe("both");
}

function expectFrameWithinPassiveLimits(t: number) {
  const frame = squatTemplate.sample(t);

  for (const jointName of passiveJointNames) {
    expect(frame.passive[jointName]).toBeGreaterThanOrEqual(PASSIVE_JOINT_LIMITS_RAD[jointName].min);
    expect(frame.passive[jointName]).toBeLessThanOrEqual(PASSIVE_JOINT_LIMITS_RAD[jointName].max);
  }
}

describe("squatTemplate", () => {
  it("samples standing pose at t=0", () => {
    expectNeutralFrame(0);
  });

  it("samples symmetric squat bottom at t=0.5", () => {
    const frame = squatTemplate.sample(0.5);

    expect(frame.active.left_hip).toBeCloseTo(70, 1);
    expect(frame.active.right_hip).toBeCloseTo(70, 1);
    expect(frame.passive.leftKnee).toBeCloseTo(90 * DEG_TO_RAD, 3);
    expect(frame.passive.rightKnee).toBeCloseTo(90 * DEG_TO_RAD, 3);
    expect(frame.passive.leftAnkle).toBeCloseTo(15 * DEG_TO_RAD, 3);
    expect(frame.passive.rightAnkle).toBeCloseTo(15 * DEG_TO_RAD, 3);
    expect(frame.stance).toBe("both");
  });

  it("samples standing pose at t=1", () => {
    expectNeutralFrame(1);
  });

  it("clamps out-of-range sample inputs safely", () => {
    expect(() => squatTemplate.sample(-0.1)).not.toThrow();
    expect(() => squatTemplate.sample(1.5)).not.toThrow();
    expectFrameWithinPassiveLimits(-0.1);
    expectFrameWithinPassiveLimits(1.5);
  });

  it("keeps every sampled passive joint within its rendering clamp range", () => {
    for (let index = 0; index < 100; index += 1) {
      const t = index / 99;

      expectFrameWithinPassiveLimits(t);
    }
  });
});

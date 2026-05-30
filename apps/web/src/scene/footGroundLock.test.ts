import { describe, expect, it } from "vitest";

import { squatTemplate } from "../anim/templates/squat";
import { sampleWalkGaitPairRad } from "../anim/walkGait";
import { computeFootGroundLockLiftY, computeFootContactWorldY, createRootLiftSmoother } from "./footGroundLock";
import { computePelvisOffsetY, type LegAngles } from "./grounding";
import { REST_FOOT_Y, RIG_GEOMETRY } from "./rigGeometry";

const DEG_TO_RAD = Math.PI / 180;
const HIP_HEIGHT = -REST_FOOT_Y;
const TWO_PI = Math.PI * 2;
const WALK_HIP_AMPLITUDE_DEG = 25;
const EPSILON = 1e-9;

const standingLeg: LegAngles = {
  hip: 0,
  knee: 0,
  ankle: 0,
};

function walkLegsAtPhase(rawPhase: number): { left: LegAngles; right: LegAngles } {
  const gait = sampleWalkGaitPairRad(rawPhase - Math.PI / 2);
  const leftHip = WALK_HIP_AMPLITUDE_DEG * Math.sin(rawPhase) * DEG_TO_RAD;
  const rightHip = -leftHip;

  return {
    left: {
      hip: leftHip,
      knee: gait.left.kneeRad,
      ankle: gait.left.ankleRad,
    },
    right: {
      hip: rightHip,
      knee: gait.right.kneeRad,
      ankle: gait.right.ankleRad,
    },
  };
}

function rootYWithLock(left: LegAngles, right: LegAngles): number {
  const pelvisOffsetY = computePelvisOffsetY(left, right, "both", RIG_GEOMETRY, REST_FOOT_Y);
  const liftY = computeFootGroundLockLiftY(left, right, RIG_GEOMETRY, HIP_HEIGHT, pelvisOffsetY);

  return pelvisOffsetY + liftY;
}

describe("foot ground lock", () => {
  it("prevents walk foot penetration across the gait cycle", () => {
    for (let index = 0; index < 360; index += 1) {
      const { left, right } = walkLegsAtPhase((index / 360) * TWO_PI);
      const rootY = rootYWithLock(left, right);
      const leftFootY = computeFootContactWorldY(left, RIG_GEOMETRY, HIP_HEIGHT, rootY);
      const rightFootY = computeFootContactWorldY(right, RIG_GEOMETRY, HIP_HEIGHT, rootY);

      expect(Math.min(leftFootY, rightFootY)).toBeGreaterThanOrEqual(-EPSILON);
    }
  });

  it("keeps walk root height finite and within a small visual band", () => {
    for (let index = 0; index < 360; index += 1) {
      const { left, right } = walkLegsAtPhase((index / 360) * TWO_PI);
      const rootY = rootYWithLock(left, right);
      const maxFootY = Math.max(
        computeFootContactWorldY(left, RIG_GEOMETRY, HIP_HEIGHT, rootY),
        computeFootContactWorldY(right, RIG_GEOMETRY, HIP_HEIGHT, rootY),
      );

      expect(Number.isFinite(maxFootY)).toBe(true);
      expect(rootY).toBeGreaterThanOrEqual(-0.15);
      expect(rootY).toBeLessThanOrEqual(0.15);
    }
  });

  it("keeps stand lift at zero", () => {
    const pelvisOffsetY = computePelvisOffsetY(standingLeg, standingLeg, "both", RIG_GEOMETRY, REST_FOOT_Y);
    const liftY = computeFootGroundLockLiftY(standingLeg, standingLeg, RIG_GEOMETRY, HIP_HEIGHT, pelvisOffsetY);

    expect(liftY).toBeLessThanOrEqual(1e-3);
  });

  it("does not fight the lowest squat pose", () => {
    const squatMid = squatTemplate.sample(0.5);
    const squatLeg: LegAngles = {
      hip: squatMid.active.left_hip * DEG_TO_RAD,
      knee: squatMid.passive.leftKnee,
      ankle: squatMid.passive.leftAnkle,
    };
    const pelvisOffsetY = computePelvisOffsetY(squatLeg, squatLeg, "both", RIG_GEOMETRY, REST_FOOT_Y);
    const liftY = computeFootGroundLockLiftY(squatLeg, squatLeg, RIG_GEOMETRY, HIP_HEIGHT, pelvisOffsetY);

    expect(liftY).toBeLessThanOrEqual(0.005);
  });

  it("resets smoothed lift on action change", () => {
    const smoother = createRootLiftSmoother();

    expect(smoother.next(0.1)).toBeCloseTo(0.1, 9);
    expect(smoother.next(0)).toBeGreaterThan(0);

    smoother.reset();

    expect(smoother.next(0.02)).toBeCloseTo(0.02, 9);
  });
});

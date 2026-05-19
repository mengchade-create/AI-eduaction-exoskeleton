import { describe, expect, it } from "vitest";

import { computeFootY, computePelvisOffsetY, type LegAngles } from "./grounding";
import { REST_FOOT_Y, RIG_GEOMETRY } from "./rigGeometry";

const DEG_TO_RAD = Math.PI / 180;

const standingLeg: LegAngles = {
  hip: 0,
  knee: 0,
  ankle: 0,
};

describe("FK rig grounding", () => {
  it("keeps standing pelvis offset at zero", () => {
    expect(computeFootY(standingLeg, RIG_GEOMETRY)).toBeCloseTo(REST_FOOT_Y, 9);
    expect(computePelvisOffsetY(standingLeg, standingLeg, "both", RIG_GEOMETRY, REST_FOOT_Y)).toBeCloseTo(0, 9);
  });

  it("lowers the pelvis for the squat midpoint", () => {
    const squatMidLeg: LegAngles = {
      hip: 70 * DEG_TO_RAD,
      knee: 90 * DEG_TO_RAD,
      ankle: 15 * DEG_TO_RAD,
    };
    const pelvisOffsetY = computePelvisOffsetY(squatMidLeg, squatMidLeg, "both", RIG_GEOMETRY, REST_FOOT_Y);

    expect(pelvisOffsetY).toBeLessThan(0);
    expect(pelvisOffsetY).toBeGreaterThanOrEqual(-0.5);
    expect(pelvisOffsetY).toBeLessThanOrEqual(-0.15);
  });

  it("uses only the left foot in left-foot stance", () => {
    const rightBentLeg: LegAngles = {
      hip: 70 * DEG_TO_RAD,
      knee: 90 * DEG_TO_RAD,
      ankle: 15 * DEG_TO_RAD,
    };
    const leftOnlyOffset = computePelvisOffsetY(standingLeg, rightBentLeg, "left", RIG_GEOMETRY, REST_FOOT_Y);
    const standingOffset = computePelvisOffsetY(standingLeg, standingLeg, "left", RIG_GEOMETRY, REST_FOOT_Y);

    expect(leftOnlyOffset).toBeCloseTo(standingOffset, 9);
  });

  it("uses the higher foot as the both-feet stance reference", () => {
    const leftSlightlyBent: LegAngles = {
      hip: 20 * DEG_TO_RAD,
      knee: 25 * DEG_TO_RAD,
      ankle: 5 * DEG_TO_RAD,
    };
    const rightDeepBent: LegAngles = {
      hip: 70 * DEG_TO_RAD,
      knee: 90 * DEG_TO_RAD,
      ankle: 15 * DEG_TO_RAD,
    };
    const bothOffset = computePelvisOffsetY(leftSlightlyBent, rightDeepBent, "both", RIG_GEOMETRY, REST_FOOT_Y);
    const rightOffset = computePelvisOffsetY(leftSlightlyBent, rightDeepBent, "right", RIG_GEOMETRY, REST_FOOT_Y);

    expect(bothOffset).toBeCloseTo(rightOffset, 9);
  });
});

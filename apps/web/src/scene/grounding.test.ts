import { describe, expect, it } from "vitest";

import {
  computeFootSagittal,
  computeFootY,
  computePelvisOffsetSagittal,
  computePelvisOffsetY,
  type LegAngles,
} from "./grounding";
import { REST_FOOT_SAGITTAL, REST_FOOT_Y, RIG_GEOMETRY } from "./rigGeometry";

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

describe("computePelvisOffsetSagittal", () => {
  it("keeps standing pelvis sagittal offset at zero", () => {
    expect(computePelvisOffsetSagittal(standingLeg, standingLeg, "both", RIG_GEOMETRY, REST_FOOT_SAGITTAL)).toBeCloseTo(0, 9);
  });

  it("moves the pelvis backward for the squat midpoint", () => {
    const squatMidLeg: LegAngles = {
      hip: 70 * DEG_TO_RAD,
      knee: 90 * DEG_TO_RAD,
      ankle: 15 * DEG_TO_RAD,
    };
    const pelvisOffsetSagittal = computePelvisOffsetSagittal(squatMidLeg, squatMidLeg, "both", RIG_GEOMETRY, REST_FOOT_SAGITTAL);

    expect(pelvisOffsetSagittal).toBeLessThan(0);
    expect(pelvisOffsetSagittal).toBeGreaterThanOrEqual(-0.4);
    expect(pelvisOffsetSagittal).toBeLessThanOrEqual(-0.05);
  });

  it("uses only the left foot in left-foot stance", () => {
    const leftBentLeg: LegAngles = {
      hip: 45 * DEG_TO_RAD,
      knee: 60 * DEG_TO_RAD,
      ankle: 10 * DEG_TO_RAD,
    };
    const rightFirstPose: LegAngles = {
      hip: 10 * DEG_TO_RAD,
      knee: 20 * DEG_TO_RAD,
      ankle: 0,
    };
    const rightSecondPose: LegAngles = {
      hip: 80 * DEG_TO_RAD,
      knee: 140 * DEG_TO_RAD,
      ankle: 25 * DEG_TO_RAD,
    };

    const firstOffset = computePelvisOffsetSagittal(leftBentLeg, rightFirstPose, "left", RIG_GEOMETRY, REST_FOOT_SAGITTAL);
    const secondOffset = computePelvisOffsetSagittal(leftBentLeg, rightSecondPose, "left", RIG_GEOMETRY, REST_FOOT_SAGITTAL);

    expect(firstOffset).toBeCloseTo(secondOffset, 9);
  });

  it("matches single-foot X offset for symmetric both-feet stance", () => {
    const symmetricBentLeg: LegAngles = {
      hip: 70 * DEG_TO_RAD,
      knee: 90 * DEG_TO_RAD,
      ankle: 15 * DEG_TO_RAD,
    };
    const bothOffset = computePelvisOffsetSagittal(symmetricBentLeg, symmetricBentLeg, "both", RIG_GEOMETRY, REST_FOOT_SAGITTAL);
    const leftOffset = computePelvisOffsetSagittal(symmetricBentLeg, symmetricBentLeg, "left", RIG_GEOMETRY, REST_FOOT_SAGITTAL);

    expect(bothOffset).toBeCloseTo(leftOffset, 9);
  });
});

describe("computeFootSagittal", () => {
  it("returns zero for all-zero angles", () => {
    expect(computeFootSagittal(standingLeg, RIG_GEOMETRY)).toBeCloseTo(0, 9);
  });

  it("projects thigh and shin forward for hip-only 90 degree flexion", () => {
    const hipOnlyFlexedLeg: LegAngles = {
      hip: Math.PI / 2,
      knee: 0,
      ankle: 0,
    };

    expect(computeFootSagittal(hipOnlyFlexedLeg, RIG_GEOMETRY)).toBeCloseTo(
      RIG_GEOMETRY.thighLength + RIG_GEOMETRY.shinLength,
      9,
    );
  });
});

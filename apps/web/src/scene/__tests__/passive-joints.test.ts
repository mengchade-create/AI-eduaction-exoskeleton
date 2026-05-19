import { describe, expect, it } from "vitest";

import type { JointAngles, TelemetryFrame } from "../../simulation/types";
import { DEFAULT_PASSIVE_JOINTS, setPassiveJoint } from "../passiveJoints";

type HipOnlyJointSchema =
  keyof JointAngles extends "left_hip" | "right_hip"
    ? "left_hip" | "right_hip" extends keyof JointAngles
      ? true
      : false
    : false;

const telemetryJointSchemaIsHipOnly: HipOnlyJointSchema = true;
const telemetryJointKeys = ["left_hip", "right_hip"] satisfies Array<keyof TelemetryFrame["joints"]>;

describe("passive avatar joints", () => {
  it("keeps TelemetryFrame JointAngles isolated to active hip joints", () => {
    expect(telemetryJointSchemaIsHipOnly).toBe(true);
    expect(telemetryJointKeys).toStrictEqual(["left_hip", "right_hip"]);
    expect(telemetryJointKeys).not.toContain("left_knee");
    expect(telemetryJointKeys).not.toContain("right_knee");
    expect(telemetryJointKeys).not.toContain("left_ankle");
    expect(telemetryJointKeys).not.toContain("right_ankle");
  });

  it("clamps passive knee and ankle setters to SPEC rendering ranges", () => {
    expect(setPassiveJoint(DEFAULT_PASSIVE_JOINTS, "leftKnee", -1).leftKnee).toBe(0);
    expect(setPassiveJoint(DEFAULT_PASSIVE_JOINTS, "leftKnee", 999).leftKnee).toBeCloseTo(2.618, 3);
    expect(setPassiveJoint(DEFAULT_PASSIVE_JOINTS, "leftAnkle", -999).leftAnkle).toBeCloseTo(-0.698, 3);
    expect(setPassiveJoint(DEFAULT_PASSIVE_JOINTS, "leftAnkle", 999).leftAnkle).toBeCloseTo(0.524, 3);
  });
});

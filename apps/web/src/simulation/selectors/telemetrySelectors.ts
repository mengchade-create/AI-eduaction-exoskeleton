import type { JointAngles, TelemetryFrame } from "../types";

export type TelemetryJointId = "leftHip" | "rightHip";

type JointAngleKey = keyof JointAngles;

const JOINT_KEYS: Record<TelemetryJointId, JointAngleKey> = {
  leftHip: "left_hip",
  rightHip: "right_hip",
};

export const Q_REF_JOINT_IDS: TelemetryJointId[] = ["leftHip", "rightHip"];

export interface QRefVsQPoint {
  t: number;
  qRef: number;
  q: number;
}

export interface StaminaState {
  value: number;
  label: "green" | "yellow" | "red";
  percent: number;
}

export function hasQRefForJoint(frame: TelemetryFrame, jointId: TelemetryJointId): boolean {
  const key = JOINT_KEYS[jointId];

  return Number.isFinite(frame.q_ref[key]) && Number.isFinite(frame.q[key]);
}

export function selectQRefVsQSeries(frames: TelemetryFrame[], jointId: TelemetryJointId): QRefVsQPoint[] {
  const key = JOINT_KEYS[jointId];

  return frames
    .filter((frame) => hasQRefForJoint(frame, jointId))
    .map((frame) => ({
      t: frame.t,
      qRef: frame.q_ref[key],
      q: frame.q[key],
    }));
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function selectStamina(frame: TelemetryFrame | undefined): StaminaState {
  if (frame === undefined) {
    return { value: 1, label: "green", percent: 100 };
  }

  const value = clamp01(1 - frame.fatigue);
  const label = value > 0.5 ? "green" : value + Number.EPSILON >= 0.2 ? "yellow" : "red";

  return {
    value,
    label,
    percent: Math.round(value * 100),
  };
}

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

export interface TauPoint {
  t: number;
  tauHuman: number;
  tauExo: number;
}

export interface StaminaState {
  value: number;
  label: "green" | "yellow" | "red";
  percent: number;
}

export interface StaminaPoint {
  t: number;
  stamina: number;
}

export function formatTelemetryTimeTick(value: number | string): string {
  const numericValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numericValue) ? numericValue.toFixed(1) : String(value);
}

export function hasQRefForJoint(frame: TelemetryFrame, jointId: TelemetryJointId): boolean {
  const key = JOINT_KEYS[jointId];

  return Number.isFinite(frame.q_ref[key]) && Number.isFinite(frame.q[key]);
}

export function hasTauForJoint(frame: TelemetryFrame, jointId: TelemetryJointId): boolean {
  const key = JOINT_KEYS[jointId];

  return Number.isFinite(frame.tau_human[key]) && Number.isFinite(frame.tau_exo[key]);
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

export function selectTauSeries(frames: TelemetryFrame[], jointId: TelemetryJointId): TauPoint[] {
  const key = JOINT_KEYS[jointId];

  return frames
    .filter((frame) => hasTauForJoint(frame, jointId))
    .map((frame) => ({
      t: frame.t,
      tauHuman: frame.tau_human[key],
      tauExo: frame.tau_exo[key],
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

export function selectStaminaSeries(frames: TelemetryFrame[]): StaminaPoint[] {
  return frames
    .filter((frame) => Number.isFinite(frame.t) && Number.isFinite(frame.fatigue))
    .map((frame) => ({
      t: frame.t,
      stamina: Math.round(clamp01(1 - frame.fatigue) * 100),
    }));
}

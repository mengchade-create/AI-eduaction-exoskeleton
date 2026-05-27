import {
  DEFAULT_PASSIVE_JOINTS,
  setPassiveJoint,
  type PassiveJointAngles,
} from "../scene/passiveJoints";
import type { StanceFoot } from "../scene/grounding";

export type ActiveJointAngles = {
  left_hip: number;
  right_hip: number;
};

export type ActionFrame = {
  t: number;
  active: ActiveJointAngles;
  passive: PassiveJointAngles;
  stance: StanceFoot;
};

// SPEC §0.1(b) / §3.5.2: ActionTemplate drives active hips plus passive avatar joints without telemetry/control-loop coupling.
export type ActionTemplate = {
  id: string;
  durationMs: number;
  sample(t: number): ActionFrame;
};

export type NumericKeyframe<TValues extends Record<string, number>> = {
  t: number;
  values: TValues;
};

export function clampUnitInterval(t: number): number {
  return Math.min(1, Math.max(0, t));
}

export function linearInterpolateKeyframes<TValues extends Record<string, number>>(
  keyframes: Array<NumericKeyframe<TValues>>,
  t: number,
): TValues {
  if (keyframes.length === 0) {
    throw new Error("linearInterpolateKeyframes requires at least one keyframe");
  }

  const clampedT = clampUnitInterval(t);
  const sorted = [...keyframes].sort((left, right) => left.t - right.t);

  if (clampedT <= sorted[0].t) {
    return { ...sorted[0].values };
  }

  const last = sorted[sorted.length - 1];
  if (clampedT >= last.t) {
    return { ...last.values };
  }

  const nextIndex = sorted.findIndex((frame) => frame.t >= clampedT);
  const previous = sorted[nextIndex - 1];
  const next = sorted[nextIndex];
  const localT = (clampedT - previous.t) / (next.t - previous.t);
  const values: Partial<Record<keyof TValues, number>> = {};

  for (const key of Object.keys(previous.values) as Array<keyof TValues>) {
    values[key] = previous.values[key] + (next.values[key] - previous.values[key]) * localT;
  }

  return values as TValues;
}

export function clampPassiveJointAngles(passive: PassiveJointAngles): PassiveJointAngles {
  return {
    leftKnee: setPassiveJoint(DEFAULT_PASSIVE_JOINTS, "leftKnee", passive.leftKnee).leftKnee,
    rightKnee: setPassiveJoint(DEFAULT_PASSIVE_JOINTS, "rightKnee", passive.rightKnee).rightKnee,
    leftAnkle: setPassiveJoint(DEFAULT_PASSIVE_JOINTS, "leftAnkle", passive.leftAnkle).leftAnkle,
    rightAnkle: setPassiveJoint(DEFAULT_PASSIVE_JOINTS, "rightAnkle", passive.rightAnkle).rightAnkle,
  };
}

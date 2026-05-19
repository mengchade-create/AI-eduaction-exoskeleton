// SPEC §0.1(b) passive joint · animation-only · NOT telemetry · NOT control.
export interface PassiveJointAngles {
  leftKnee: number;
  rightKnee: number;
  leftAnkle: number;
  rightAnkle: number;
}

export type PassiveJointName = keyof PassiveJointAngles;

export const PASSIVE_JOINT_LIMITS_RAD: Record<PassiveJointName, { min: number; max: number }> = {
  leftKnee: { min: 0, max: (150 * Math.PI) / 180 },
  rightKnee: { min: 0, max: (150 * Math.PI) / 180 },
  leftAnkle: { min: (-40 * Math.PI) / 180, max: (30 * Math.PI) / 180 },
  rightAnkle: { min: (-40 * Math.PI) / 180, max: (30 * Math.PI) / 180 },
};

export const DEFAULT_PASSIVE_JOINTS: PassiveJointAngles = {
  leftKnee: 0,
  rightKnee: 0,
  leftAnkle: 0,
  rightAnkle: 0,
};

export function clampPassiveJointRad(joint: PassiveJointName, valueRad: number): number {
  const limit = PASSIVE_JOINT_LIMITS_RAD[joint];

  return Math.min(limit.max, Math.max(limit.min, valueRad));
}

export function setPassiveJoint(
  angles: PassiveJointAngles,
  joint: PassiveJointName,
  valueRad: number,
): PassiveJointAngles {
  return {
    ...angles,
    [joint]: clampPassiveJointRad(joint, valueRad),
  };
}

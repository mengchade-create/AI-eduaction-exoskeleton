import { squatTemplate } from "../anim/templates/squat";
import { clampPassiveJointAngles } from "../anim/ActionTemplate";
import { DEFAULT_PASSIVE_JOINTS, type PassiveJointAngles } from "../scene/passiveJoints";
import type { StanceFoot } from "../scene/grounding";
import type { TelemetryFrame } from "../simulation/types";
import type { SimActionButtonAction } from "../components/sim/ActionButtonGroup";

const DEG_TO_RAD = Math.PI / 180;
const WALK_HIP_AMPLITUDE_DEG = 25;
const WALK_KNEE_MAX_DEG = 25;
const WALK_ANKLE_MAX_DEG = 6;

export interface ManualRigPose {
  leftHipDeg: number;
  rightHipDeg: number;
  passiveJoints: PassiveJointAngles;
}

export interface SimRigFrame {
  leftHipDeg: number;
  rightHipDeg: number;
  passiveJoints: PassiveJointAngles;
  stance: StanceFoot;
}

function sampleSquatFrame(timestampS: number) {
  const durationS = squatTemplate.durationMs / 1000;
  const phase = durationS === 0 ? 0 : (timestampS % durationS) / durationS;

  return squatTemplate.sample(phase);
}

function sampleWalkPassiveJoints(frame: TelemetryFrame | undefined): PassiveJointAngles {
  if (frame === undefined) {
    return DEFAULT_PASSIVE_JOINTS;
  }

  const leftSwing = Math.max(0, Math.min(1, frame.q_ref.left_hip / WALK_HIP_AMPLITUDE_DEG));
  const rightSwing = Math.max(0, Math.min(1, frame.q_ref.right_hip / WALK_HIP_AMPLITUDE_DEG));

  return clampPassiveJointAngles({
    leftKnee: leftSwing * WALK_KNEE_MAX_DEG * DEG_TO_RAD,
    rightKnee: rightSwing * WALK_KNEE_MAX_DEG * DEG_TO_RAD,
    leftAnkle: leftSwing * WALK_ANKLE_MAX_DEG * DEG_TO_RAD,
    rightAnkle: rightSwing * WALK_ANKLE_MAX_DEG * DEG_TO_RAD,
  });
}

export function selectSimRigFrame(
  action: SimActionButtonAction,
  frame: TelemetryFrame | undefined,
  manualPose: ManualRigPose,
  actionElapsedS = frame?.t ?? 0,
): SimRigFrame {
  if (action === "stand") {
    return {
      leftHipDeg: manualPose.leftHipDeg,
      rightHipDeg: manualPose.rightHipDeg,
      passiveJoints: manualPose.passiveJoints,
      stance: "both",
    };
  }

  const activePose = {
    leftHipDeg: frame?.q_ref.left_hip ?? 0,
    rightHipDeg: frame?.q_ref.right_hip ?? 0,
  };

  if (action === "squat") {
    const sampledFrame = sampleSquatFrame(Math.max(0, actionElapsedS));

    return {
      leftHipDeg: sampledFrame.active.left_hip,
      rightHipDeg: sampledFrame.active.right_hip,
      passiveJoints: sampledFrame.passive,
      stance: sampledFrame.stance,
    };
  }

  return {
    ...activePose,
    passiveJoints: sampleWalkPassiveJoints(frame),
    stance: "both",
  };
}

import { squatTemplate } from "../anim/templates/squat";
import { DEFAULT_PASSIVE_JOINTS, type PassiveJointAngles } from "../scene/passiveJoints";
import type { StanceFoot } from "../scene/grounding";
import type { TelemetryFrame } from "../simulation/types";
import type { SimActionButtonAction } from "../components/sim/ActionButtonGroup";

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

export function selectSimRigFrame(
  action: SimActionButtonAction,
  frame: TelemetryFrame | undefined,
  manualPose: ManualRigPose,
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
    const sampledFrame = sampleSquatFrame(frame?.t ?? 0);

    return {
      ...activePose,
      passiveJoints: sampledFrame.passive,
      stance: sampledFrame.stance,
    };
  }

  return {
    ...activePose,
    passiveJoints: DEFAULT_PASSIVE_JOINTS,
    stance: "both",
  };
}

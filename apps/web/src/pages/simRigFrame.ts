import { squatTemplate } from "../anim/templates/squat";
import { sampleWalkGaitPairRad } from "../anim/walkGait";
import { clampPassiveJointAngles } from "../anim/ActionTemplate";
import type { PassiveJointAngles } from "../scene/passiveJoints";
import type { StanceFoot } from "../scene/grounding";
import type { TelemetryFrame } from "../simulation/types";
import type { SimActionButtonAction } from "../components/sim/ActionButtonGroup";

const WALK_CYCLE_HZ = 1;

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

function sampleWalkPassiveJoints(actionElapsedS: number): PassiveJointAngles {
  const leftPhase = Math.max(0, actionElapsedS) * WALK_CYCLE_HZ * 2 * Math.PI;
  const { left, right } = sampleWalkGaitPairRad(leftPhase);

  return clampPassiveJointAngles({
    leftKnee: left.kneeRad,
    rightKnee: right.kneeRad,
    leftAnkle: left.ankleRad,
    rightAnkle: right.ankleRad,
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
    passiveJoints: sampleWalkPassiveJoints(actionElapsedS),
    stance: "both",
  };
}

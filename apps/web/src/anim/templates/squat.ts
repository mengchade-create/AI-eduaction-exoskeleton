import {
  clampPassiveJointAngles,
  linearInterpolateKeyframes,
  type ActionFrame,
  type ActionTemplate,
  type NumericKeyframe,
} from "../ActionTemplate";

const DEG_TO_RAD = Math.PI / 180;

type SquatKeyframeDegrees = {
  hip: number;
  knee: number;
  ankle: number;
};

// SPEC §0.1(b) / §5 Phase 1: squat is an ActionTemplate kinematic animation; passive knee/ankle stay out of telemetry/control.
const squatKeyframesDeg: Array<NumericKeyframe<SquatKeyframeDegrees>> = [
  { t: 0, values: { hip: 0, knee: 0, ankle: 0 } },
  { t: 0.5, values: { hip: 70, knee: 90, ankle: 15 } },
  { t: 1, values: { hip: 0, knee: 0, ankle: 0 } },
];

export const squatTemplate: ActionTemplate = {
  id: "squat",
  durationMs: 2000,
  sample(t: number): ActionFrame {
    const sampleDeg = linearInterpolateKeyframes(squatKeyframesDeg, t);
    const kneeRad = sampleDeg.knee * DEG_TO_RAD;
    const ankleRad = sampleDeg.ankle * DEG_TO_RAD;

    return {
      active: {
        left_hip: sampleDeg.hip,
        right_hip: sampleDeg.hip,
      },
      passive: clampPassiveJointAngles({
        leftKnee: kneeRad,
        rightKnee: kneeRad,
        leftAnkle: ankleRad,
        rightAnkle: ankleRad,
      }),
    };
  },
};

export default squatTemplate;

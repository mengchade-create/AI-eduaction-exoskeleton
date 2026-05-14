import type { ActionTemplateId } from "../types";
import { deg2rad } from "../utils";

export interface IntentOutput {
  leftHipTargetPosRad: number;
  leftHipTargetVelRad: number;
  rightHipTargetPosRad: number;
  rightHipTargetVelRad: number;
}

export class HumanIntentModel {
  /**
   * walk: opposing sine waves, 30 degrees amplitude, 1 Hz.
   * squat: matching waves, 0 to -45 degrees, 0.5 Hz.
   * idle: neutral.
   */
  compute(t: number, template: ActionTemplateId): IntentOutput {
    if (template === "walk") {
      const amplitudeRad = deg2rad(30);
      const omega = 2 * Math.PI;
      const pos = amplitudeRad * Math.sin(omega * t);
      const vel = amplitudeRad * omega * Math.cos(omega * t);

      return {
        leftHipTargetPosRad: pos,
        leftHipTargetVelRad: vel,
        rightHipTargetPosRad: -pos,
        rightHipTargetVelRad: -vel,
      };
    }

    if (template === "squat") {
      const amplitudeRad = deg2rad(22.5);
      const omega = Math.PI;
      const pos = -amplitudeRad * (1 - Math.cos(omega * t));
      const vel = -amplitudeRad * omega * Math.sin(omega * t);

      return {
        leftHipTargetPosRad: pos,
        leftHipTargetVelRad: vel,
        rightHipTargetPosRad: pos,
        rightHipTargetVelRad: vel,
      };
    }

    return {
      leftHipTargetPosRad: 0,
      leftHipTargetVelRad: 0,
      rightHipTargetPosRad: 0,
      rightHipTargetVelRad: 0,
    };
  }
}

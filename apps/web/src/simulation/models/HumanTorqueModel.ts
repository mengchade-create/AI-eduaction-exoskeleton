import type { JointState } from "../types";
import { clamp } from "../utils";

export interface TorqueModelConfig {
  kp: number;
  kd: number;
  tauMax: number;
}

export class HumanTorqueModel {
  constructor(private cfg: TorqueModelConfig = { kp: 50, kd: 5, tauMax: 40 }) {}

  compute(targetPosRad: number, targetVelRad: number, actual: JointState): number {
    const posErr = targetPosRad - actual.posRad;
    const velErr = targetVelRad - actual.velRad;
    const tau = this.cfg.kp * posErr + this.cfg.kd * velErr;

    return clamp(tau, -this.cfg.tauMax, this.cfg.tauMax);
  }
}

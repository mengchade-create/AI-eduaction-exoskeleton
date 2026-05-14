import type { JointState, KernelConfig, KernelInputs, KernelState } from "./types";
import { FatigueModel } from "./models/FatigueModel";
import { HumanIntentModel } from "./models/HumanIntentModel";
import { HumanTorqueModel } from "./models/HumanTorqueModel";
import { JointDynamics } from "./models/JointDynamics";
import { StrategyScorer } from "./models/StrategyScorer";

export class SimulationKernel {
  private dt: number;
  private t = 0;
  private leftHip: JointState;
  private rightHip: JointState;

  private intent = new HumanIntentModel();
  private torque = new HumanTorqueModel();
  private dynLeft = new JointDynamics();
  private dynRight = new JointDynamics();
  private fatigue = new FatigueModel();
  private scorer = new StrategyScorer();

  constructor(cfg: KernelConfig = {}) {
    this.dt = cfg.dt ?? 1 / 60;
    this.leftHip = this.zeroJoint();
    this.rightHip = this.zeroJoint();
  }

  step(inputs: KernelInputs): KernelState {
    const intent = this.intent.compute(this.t, inputs.actionTemplate);
    const leftHumanTau = inputs.emergencyStop
      ? 0
      : this.torque.compute(
          intent.leftHipTargetPosRad,
          intent.leftHipTargetVelRad,
          this.leftHip,
        );
    const rightHumanTau = inputs.emergencyStop
      ? 0
      : this.torque.compute(
          intent.rightHipTargetPosRad,
          intent.rightHipTargetVelRad,
          this.rightHip,
        );
    const leftExoTau = 0;
    const rightExoTau = 0;

    const leftNext = this.dynLeft.step(
      this.leftHip.posRad,
      this.leftHip.velRad,
      leftHumanTau + leftExoTau,
      this.dt,
    );
    const rightNext = this.dynRight.step(
      this.rightHip.posRad,
      this.rightHip.velRad,
      rightHumanTau + rightExoTau,
      this.dt,
    );

    this.leftHip = {
      posRad: leftNext.posRad,
      velRad: leftNext.velRad,
      torqueHumanNm: leftHumanTau,
      torqueExoNm: leftExoTau,
    };
    this.rightHip = {
      posRad: rightNext.posRad,
      velRad: rightNext.velRad,
      torqueHumanNm: rightHumanTau,
      torqueExoNm: rightExoTau,
    };

    const fatigue = this.fatigue.update(
      Math.abs(leftHumanTau) + Math.abs(rightHumanTau),
      this.dt,
    );
    const score = this.scorer.score(
      inputs.strategyId,
      Math.abs(leftHumanTau) + Math.abs(rightHumanTau),
      Math.abs(leftExoTau) + Math.abs(rightExoTau),
      fatigue,
    );

    this.t += this.dt;

    return {
      t: this.t,
      leftHip: { ...this.leftHip },
      rightHip: { ...this.rightHip },
      fatigue,
      instantScore: score.instant,
      cumulativeScore: score.cumulative,
    };
  }

  getState(): KernelState {
    return {
      t: this.t,
      leftHip: { ...this.leftHip },
      rightHip: { ...this.rightHip },
      fatigue: this.fatigue.value,
      instantScore: 50,
      cumulativeScore: 50,
    };
  }

  reset(): void {
    this.t = 0;
    this.leftHip = this.zeroJoint();
    this.rightHip = this.zeroJoint();
    this.fatigue.reset();
    this.scorer.reset();
  }

  private zeroJoint(): JointState {
    return { posRad: 0, velRad: 0, torqueHumanNm: 0, torqueExoNm: 0 };
  }
}

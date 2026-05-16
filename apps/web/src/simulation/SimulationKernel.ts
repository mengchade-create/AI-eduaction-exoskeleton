import type {
  ActionTemplateId,
  JointState,
  KernelConfig,
  KernelState,
  Pose,
  StrategyParams,
  TelemetryFrame,
} from "./types";
import { FatigueModel } from "./models/FatigueModel";
import { HumanIntentModel } from "./models/HumanIntentModel";
import { HumanTorqueModel } from "./models/HumanTorqueModel";
import { JointDynamics } from "./models/JointDynamics";
import { StrategyScorer } from "./models/StrategyScorer";
import { mulberry32, rad2deg } from "./utils";

type ImplementedAction = "stand" | "walk";
type Subscriber = (frame: TelemetryFrame) => void;

const DEFAULT_DT = 0.002;
const TELEMETRY_PERIOD = 1 / 60;

export class SimulationKernel {
  private readonly dt: number;
  private readonly prng: () => number;
  private t = 0;
  private nextTelemetryAt = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private action: ImplementedAction = "stand";
  private leftHip: JointState;
  private rightHip: JointState;
  private stepCount = 0;
  private previousLeftPosRad = 0;
  private instantScore = 50;
  private cumulativeScore = 50;
  private subscribers = new Set<Subscriber>();

  private intent = new HumanIntentModel();
  private torque = new HumanTorqueModel();
  private dynLeft = new JointDynamics();
  private dynRight = new JointDynamics();
  private fatigue = new FatigueModel();
  private scorer = new StrategyScorer();

  constructor(cfg: KernelConfig = {}) {
    this.dt = cfg.dt ?? DEFAULT_DT;
    this.prng = mulberry32(cfg.seed ?? 42);
    this.leftHip = this.zeroJoint();
    this.rightHip = this.zeroJoint();
  }

  playAction(action: ActionTemplateId): void {
    if (action !== "stand" && action !== "walk") {
      throw new Error(`${action} not implemented yet`);
    }

    this.action = action;
    this.stopTimer();
    this.timer = setInterval(() => {
      this.integrateOneTick();
    }, this.dt * 1000);
  }

  stop(): void {
    this.stopTimer();
    const finalScore = this.scorer.finalScore(this.fatigue.value);
    this.instantScore = finalScore.instant;
    this.cumulativeScore = finalScore.cumulative;
    this.resetState();
    this.emitTelemetry(true);
  }

  setStrategy(params: Partial<StrategyParams>): void {
    const supportedKeys = new Set<keyof StrategyParams>(["speedScale", "hipAmplitudeDeg"]);
    const ignoredKeys = Object.keys(params).filter(
      (key) => !supportedKeys.has(key as keyof StrategyParams),
    );

    if (ignoredKeys.length > 0) {
      console.warn(`Ignored strategy fields: ${ignoredKeys.join(", ")}`);
    }

    this.intent.setConfig({
      speedScale: params.speedScale,
      hipAmplitudeDeg: params.hipAmplitudeDeg,
    });
  }

  subscribe(cb: Subscriber): () => void {
    this.subscribers.add(cb);

    return () => {
      this.subscribers.delete(cb);
    };
  }

  getPose(): Pose {
    return {
      left_hip_deg: rad2deg(this.leftHip.posRad),
      right_hip_deg: rad2deg(this.rightHip.posRad),
    };
  }

  getState(): KernelState {
    return {
      t: this.t,
      leftHip: { ...this.leftHip },
      rightHip: { ...this.rightHip },
      fatigue: this.fatigue.value,
      instantScore: this.instantScore,
      cumulativeScore: this.cumulativeScore,
    };
  }

  reset(): void {
    this.stopTimer();
    this.resetState();
  }

  private integrateOneTick(): void {
    void this.prng;

    const intent = this.intent.compute(this.t, this.action);
    const leftHumanTau = this.torque.compute(
      intent.leftHipTargetPosRad,
      intent.leftHipTargetVelRad,
      this.leftHip,
    );
    const rightHumanTau = this.torque.compute(
      intent.rightHipTargetPosRad,
      intent.rightHipTargetVelRad,
      this.rightHip,
    );
    const leftExoTau = this.computeExoTorque();
    const rightExoTau = this.computeExoTorque();

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

    this.fatigue.accumulate(leftHumanTau, this.leftHip.velRad, this.dt);
    this.fatigue.accumulate(rightHumanTau, this.rightHip.velRad, this.dt);
    this.updateStepCount();
    this.t += this.dt;

    if (this.t + Number.EPSILON >= this.nextTelemetryAt) {
      this.emitTelemetry(false);
      this.nextTelemetryAt += TELEMETRY_PERIOD;
    }
  }

  private emitTelemetry(final: boolean): void {
    const frame = this.toTelemetryFrame(final);

    for (const cb of this.subscribers) {
      cb(frame);
    }
  }

  private toTelemetryFrame(final: boolean): TelemetryFrame {
    return {
      timestamp: Math.round(this.t * 1000),
      source: "simulated",
      imu: {
        ax: 0,
        ay: 0,
        az: 0,
        gx: 0,
        gy: 0,
        gz: 0,
      },
      joints: {
        left_hip: rad2deg(this.leftHip.posRad),
        right_hip: rad2deg(this.rightHip.posRad),
      },
      motors: {
        left_hip_torque: this.leftHip.torqueExoNm,
        right_hip_torque: this.rightHip.torqueExoNm,
        left_hip_current: 0,
        right_hip_current: 0,
      },
      step_count: this.stepCount,
      battery: 1,
      assist_mode: "off",
      final,
    };
  }

  private updateStepCount(): void {
    if (this.previousLeftPosRad < 0 && this.leftHip.posRad >= 0) {
      this.stepCount += 1;
    }

    this.previousLeftPosRad = this.leftHip.posRad;
  }

  private computeExoTorque(): number {
    return 0;
  }

  private resetState(): void {
    this.t = 0;
    this.nextTelemetryAt = 0;
    this.leftHip = this.zeroJoint();
    this.rightHip = this.zeroJoint();
    this.stepCount = 0;
    this.previousLeftPosRad = 0;
    this.instantScore = 50;
    this.cumulativeScore = 50;
    this.fatigue.reset();
    this.scorer.reset();
  }

  private stopTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private zeroJoint(): JointState {
    return { posRad: 0, velRad: 0, torqueHumanNm: 0, torqueExoNm: 0 };
  }
}

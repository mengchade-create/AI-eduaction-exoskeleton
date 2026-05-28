import type {
  ActionTemplateId,
  ActionType,
  JointState,
  KernelConfig,
  KernelState,
  PlayActionOptions,
  Pose,
  ScoreBreakdown,
  TelemetryFrame,
} from "./types";
import { FatigueModel } from "./models/FatigueModel";
import { HumanIntentModel } from "./models/HumanIntentModel";
import { HumanTorqueModel } from "./models/HumanTorqueModel";
import { JointDynamics } from "./models/JointDynamics";
import { StrategyScorer } from "./models/StrategyScorer";
import { deg2rad, mulberry32, rad2deg } from "./utils";
import { SIT_HIP_DEG, SIT_TO_STAND_DURATION_S, STEP_COUNT } from "./models/HumanIntentModel";
import { createStrategy } from "./strategies/StrategyFactory";
import type { Strategy, StrategyJointAngles, StrategyJointVelocities, StrategyLevel } from "./strategies/Strategy";

type Subscriber = (frame: TelemetryFrame) => void;
type ActionCompleteSubscriber = (completedAction: ActionTemplateId) => void;

const DEFAULT_DT = 0.002;
const TELEMETRY_PERIOD = 1 / 60;

export class SimulationKernel {
  private readonly dt: number;
  private readonly prng: () => number;
  private t = 0;
  private nextTelemetryAt = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private action: ActionTemplateId = "stand";
  private publicAction: ActionType = "idle";
  private actionStartedAt = 0;
  private leftHip: JointState;
  private rightHip: JointState;
  private stepCount = 0;
  private actionStepCount = 0;
  private targetStepCount = STEP_COUNT;
  private previousLeftPosRad = 0;
  private instantScore = 50;
  private cumulativeScore = 50;
  private strategy: Strategy;
  private pendingStrategyLevel: StrategyLevel | null = null;
  private scoreSnapshot: ScoreBreakdown | null = null;
  private subscribers = new Set<Subscriber>();
  private actionCompleteSubscribers = new Set<ActionCompleteSubscriber>();
  private lastTelemetryFrame: TelemetryFrame | null = null;
  private lastQRef: StrategyJointAngles = { leftHip: 0, rightHip: 0 };
  private lastDqRef: StrategyJointVelocities = { leftHip: 0, rightHip: 0 };

  private intent = new HumanIntentModel();
  private torque = new HumanTorqueModel();
  private dynLeft = new JointDynamics();
  private dynRight = new JointDynamics();
  private fatigue = new FatigueModel();
  private scorer = new StrategyScorer();

  constructor(cfg: KernelConfig = {}) {
    this.dt = cfg.dt ?? DEFAULT_DT;
    this.prng = mulberry32(cfg.seed ?? 42);
    this.strategy = createStrategy(cfg.initialStrategyLevel ?? 1);
    this.leftHip = this.zeroJoint();
    this.rightHip = this.zeroJoint();
    this.intent.forceAction("stand", this.t);
  }

  playAction(action: ActionTemplateId, options: PlayActionOptions = {}): void {
    this.configureAction(action, options);
    this.stopTimer();
    this.timer = setInterval(() => {
      this.integrateOneTick();
    }, this.dt * 1000);
  }

  configureAction(action: ActionTemplateId, options: PlayActionOptions = {}): void {
    if (options.stepCount !== undefined && action !== "step") {
      console.warn("stepCount option is ignored for non-step actions");
    }

    this.action = action;
    this.publicAction = action;
    this.actionStartedAt = this.t;
    this.actionStepCount = 0;
    this.targetStepCount = options.stepCount ?? STEP_COUNT;
    this.previousLeftPosRad = this.leftHip.posRad;

    if (action === "sit_to_stand") {
      this.leftHip = this.jointAtDeg(SIT_HIP_DEG);
      this.rightHip = this.jointAtDeg(SIT_HIP_DEG);
      this.previousLeftPosRad = this.leftHip.posRad;
      this.intent.beginAction(action, this.t, this.intent.sittingOutput());
    } else {
      this.intent.beginAction(action, this.t);
    }
  }

  stop(): ScoreBreakdown {
    this.stopTimer();
    this.scoreSnapshot = this.scorer.finalScore(this.strategy.id, this.t, this.publicAction);
    this.instantScore = this.scoreSnapshot.total;
    this.cumulativeScore = this.scoreSnapshot.total;
    this.resetState();
    this.emitTelemetry(true);
    return this.scoreSnapshot;
  }

  setStrategy(level: StrategyLevel): void {
    this.pendingStrategyLevel = level;
  }

  setStrategyLevel(level: StrategyLevel): void {
    this.strategy = createStrategy(level);
    this.pendingStrategyLevel = null;
  }

  subscribe(cb: Subscriber): () => void {
    this.subscribers.add(cb);

    return () => {
      this.subscribers.delete(cb);
    };
  }

  advanceBy(dtMs: number): TelemetryFrame {
    const targetT = this.t + dtMs / 1000;

    while (this.t + this.dt <= targetT + Number.EPSILON) {
      this.integrateOneTick();
    }

    return this.lastTelemetryFrame ?? this.toTelemetryFrame(false);
  }

  onActionComplete(cb: ActionCompleteSubscriber): () => void {
    this.actionCompleteSubscribers.add(cb);

    return () => {
      this.actionCompleteSubscribers.delete(cb);
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

  getCurrentStrategy(): { id: string; level: number } {
    return { id: this.strategy.id, level: this.strategy.level };
  }

  getScoreSnapshot(): ScoreBreakdown | null {
    return this.scoreSnapshot;
  }

  getCurrentAction(): ActionType {
    return this.publicAction;
  }

  reset(): void {
    this.stopTimer();
    this.resetState();
  }

  private integrateOneTick(): void {
    void this.prng;

    const intent = this.intent.compute(this.t);
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
    const phase = this.computePhase();
    const q = { leftHip: this.leftHip.posRad, rightHip: this.rightHip.posRad };
    const dq = { leftHip: this.leftHip.velRad, rightHip: this.rightHip.velRad };
    const qRef = {
      leftHip: intent.leftHipTargetPosRad,
      rightHip: intent.rightHipTargetPosRad,
    };
    const dqRef = {
      leftHip: intent.leftHipTargetVelRad,
      rightHip: intent.rightHipTargetVelRad,
    };
    this.lastQRef = qRef;
    this.lastDqRef = dqRef;

    const assistTorque = this.strategy.computeAssistTorque({
      q,
      dq,
      q_ref: qRef,
      dq_ref: dqRef,
      tau_human: { leftHip: leftHumanTau, rightHip: rightHumanTau },
      fatigue: this.fatigue.value,
      action: this.action,
      phase,
      t: this.t,
    });
    const leftExoTau = assistTorque.leftHip;
    const rightExoTau = assistTorque.rightHip;

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
    this.scorer.record({
      leftPosRad: this.leftHip.posRad,
      rightPosRad: this.rightHip.posRad,
      leftVelRad: this.leftHip.velRad,
      rightVelRad: this.rightHip.velRad,
      leftTauHumanNm: leftHumanTau,
      rightTauHumanNm: rightHumanTau,
      leftTauExoNm: leftExoTau,
      rightTauExoNm: rightExoTau,
      fatigue: this.fatigue.value,
      dt: this.dt,
    });
    this.updateStepCount();
    this.t += this.dt;
    this.updateActionCompletion();

    if (this.t + Number.EPSILON >= this.nextTelemetryAt) {
      this.emitTelemetry(false);
      this.nextTelemetryAt += TELEMETRY_PERIOD;
    }
  }

  private emitTelemetry(final: boolean): void {
    this.applyPendingStrategy();
    const frame = this.toTelemetryFrame(final);
    this.lastTelemetryFrame = frame;

    for (const cb of this.subscribers) {
      cb(frame);
    }
  }

  private toTelemetryFrame(final: boolean): TelemetryFrame {
    return {
      timestamp: Math.round(this.t * 1000),
      t: this.t,
      real_t_ms: Math.round(this.t * 1000),
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
      q: {
        left_hip: rad2deg(this.leftHip.posRad),
        right_hip: rad2deg(this.rightHip.posRad),
      },
      q_ref: {
        left_hip: rad2deg(this.lastQRef.leftHip),
        right_hip: rad2deg(this.lastQRef.rightHip),
      },
      dq: {
        left_hip: rad2deg(this.leftHip.velRad),
        right_hip: rad2deg(this.rightHip.velRad),
      },
      dq_ref: {
        left_hip: rad2deg(this.lastDqRef.leftHip),
        right_hip: rad2deg(this.lastDqRef.rightHip),
      },
      tau_human: {
        left_hip: this.leftHip.torqueHumanNm,
        right_hip: this.rightHip.torqueHumanNm,
      },
      tau_exo: {
        left_hip: this.leftHip.torqueExoNm,
        right_hip: this.rightHip.torqueExoNm,
      },
      motors: {
        left_hip_torque: this.leftHip.torqueExoNm,
        right_hip_torque: this.rightHip.torqueExoNm,
        left_hip_current: 0,
        right_hip_current: 0,
      },
      fatigue: this.fatigue.value,
      action: this.publicAction,
      phase: this.computePhase(),
      step_count: this.stepCount,
      battery: 1,
      assist_mode: "off",
      strategy_id: this.strategy.id,
      final,
    };
  }

  private updateStepCount(): void {
    if (this.previousLeftPosRad < 0 && this.leftHip.posRad >= 0) {
      this.stepCount += 1;
      if (this.action === "step" && !this.intent.isBlending(this.t)) {
        this.actionStepCount += 1;
      }
    }

    this.previousLeftPosRad = this.leftHip.posRad;
  }

  private updateActionCompletion(): void {
    if (this.action === "sit_to_stand" && this.t - this.actionStartedAt >= SIT_TO_STAND_DURATION_S) {
      this.completeAction("sit_to_stand");
    }

    if (this.action === "step" && this.actionStepCount >= this.targetStepCount) {
      this.completeAction("step");
    }
  }

  private completeAction(completedAction: ActionTemplateId): void {
    this.action = "stand";
    this.publicAction = "idle";
    this.actionStartedAt = this.t;
    this.intent.beginAction("stand", this.t);

    for (const cb of this.actionCompleteSubscribers) {
      cb(completedAction);
    }
  }

  private applyPendingStrategy(): void {
    if (this.pendingStrategyLevel === null) {
      return;
    }

    this.strategy = createStrategy(this.pendingStrategyLevel);
    this.pendingStrategyLevel = null;
    this.scorer.reset();
    this.scoreSnapshot = null;
  }

  private computePhase(): number {
    const elapsed = Math.max(0, this.t - this.actionStartedAt);
    const period = this.action === "squat" ? 2 : 1;
    return (elapsed % period) / period;
  }

  private resetState(): void {
    this.t = 0;
    this.nextTelemetryAt = 0;
    this.leftHip = this.zeroJoint();
    this.rightHip = this.zeroJoint();
    this.stepCount = 0;
    this.actionStepCount = 0;
    this.targetStepCount = STEP_COUNT;
    this.previousLeftPosRad = 0;
    this.instantScore = 50;
    this.cumulativeScore = 50;
    this.fatigue.reset();
    this.scorer.reset();
    this.action = "stand";
    this.actionStartedAt = this.t;
    this.intent.forceAction("stand", this.t);
    this.lastQRef = { leftHip: 0, rightHip: 0 };
    this.lastDqRef = { leftHip: 0, rightHip: 0 };
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

  private jointAtDeg(posDeg: number): JointState {
    return { posRad: deg2rad(posDeg), velRad: 0, torqueHumanNm: 0, torqueExoNm: 0 };
  }
}

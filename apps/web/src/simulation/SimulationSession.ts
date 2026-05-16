import { SimulationKernel } from "./SimulationKernel";
import type {
  ActionTemplateId,
  ActionType,
  ScoreBreakdown,
  SessionState,
  TelemetryFrame,
  Unsubscribe,
} from "./types";
import type { StrategyLevel } from "./strategies/Strategy";

export interface SimulationSessionOptions {
  seed?: number;
  initialStrategyLevel?: StrategyLevel;
  initialAction?: ActionType;
}

export interface SessionReplay {
  seed: number;
  initialAction: ActionType;
  initialStrategyLevel: StrategyLevel;
  events: Array<
    | { t: number; type: "setAction"; action: ActionType }
    | { t: number; type: "setStrategy"; level: StrategyLevel }
    | { t: number; type: "stop" }
  >;
}

type TelemetrySubscriber = (frame: TelemetryFrame) => void;
type StateSubscriber = (state: SessionState) => void;

export const SESSION_DEFAULT_STEP_MS = 16;

export class SimulationSession {
  private readonly seed: number;
  private readonly initialStrategyLevel: StrategyLevel;
  private readonly initialAction: ActionType;
  private kernel: SimulationKernel;
  private state: SessionState = "idle";
  private currentAction: ActionType;
  private elapsedMs = 0;
  private telemetrySubscribers: TelemetrySubscriber[] = [];
  private stateSubscribers: StateSubscriber[] = [];
  private events: SessionReplay["events"] = [];
  private finalScore: ScoreBreakdown | null = null;

  constructor(opts: SimulationSessionOptions = {}) {
    this.seed = opts.seed ?? 0;
    this.initialStrategyLevel = opts.initialStrategyLevel ?? 1;
    this.initialAction = opts.initialAction ?? "idle";
    this.currentAction = this.initialAction;
    this.kernel = this.createKernel();
  }

  start(): void {
    if (this.state !== "idle") {
      this.throwIllegal("start");
    }

    this.state = "running";
    this.applyAction(this.initialAction);
    this.emitState();
  }

  pause(): void {
    if (this.state !== "running") {
      this.throwIllegal("pause");
    }

    this.state = "paused";
    this.emitState();
  }

  resume(): void {
    if (this.state !== "paused") {
      this.throwIllegal("resume");
    }

    this.state = "running";
    this.emitState();
  }

  stop(): ScoreBreakdown {
    if (this.state !== "running" && this.state !== "paused") {
      this.throwIllegal("stop");
    }

    this.events.push({ t: this.elapsedMs / 1000, type: "stop" });
    this.finalScore = this.kernel.stop();
    this.state = "stopped";
    this.emitState();
    return this.finalScore;
  }

  reset(): void {
    this.kernel = this.createKernel();
    this.state = "idle";
    this.currentAction = this.initialAction;
    this.elapsedMs = 0;
    this.events = [];
    this.finalScore = null;
    this.emitState();
  }

  step(dtMs: number = SESSION_DEFAULT_STEP_MS): TelemetryFrame {
    if (this.state !== "running") {
      this.throwIllegal("step");
    }

    this.elapsedMs += dtMs;
    const frame = this.withSessionFields(this.kernel.advanceBy(dtMs));
    this.emitTelemetry(frame);
    return frame;
  }

  setAction(action: ActionType): void {
    if (this.state === "stopped") {
      this.throwIllegal("setAction");
    }

    this.currentAction = action;
    this.applyAction(action);
    this.events.push({ t: this.elapsedMs / 1000, type: "setAction", action });
  }

  setStrategy(level: StrategyLevel): void {
    if (this.state === "stopped") {
      this.throwIllegal("setStrategy");
    }

    this.kernel.setStrategy(level);
    this.events.push({ t: this.elapsedMs / 1000, type: "setStrategy", level });
  }

  onTelemetry(cb: TelemetrySubscriber): Unsubscribe {
    this.telemetrySubscribers.push(cb);

    return () => {
      this.telemetrySubscribers = this.telemetrySubscribers.filter((subscriber) => subscriber !== cb);
    };
  }

  onStateChange(cb: StateSubscriber): Unsubscribe {
    this.stateSubscribers.push(cb);

    return () => {
      this.stateSubscribers = this.stateSubscribers.filter((subscriber) => subscriber !== cb);
    };
  }

  getState(): SessionState {
    return this.state;
  }

  getCurrentStrategy(): { id: string; level: number } {
    return this.kernel.getCurrentStrategy();
  }

  getCurrentAction(): ActionType {
    return this.currentAction;
  }

  getElapsedMs(): number {
    return this.elapsedMs;
  }

  exportReplay(): SessionReplay {
    return {
      seed: this.seed,
      initialAction: this.initialAction,
      initialStrategyLevel: this.initialStrategyLevel,
      events: [...this.events],
    };
  }

  static replay(replay: SessionReplay): { frames: TelemetryFrame[]; finalScore: ScoreBreakdown } {
    const session = new SimulationSession({
      seed: replay.seed,
      initialAction: replay.initialAction,
      initialStrategyLevel: replay.initialStrategyLevel,
    });
    const frames: TelemetryFrame[] = [];
    let finalScore: ScoreBreakdown | null = null;

    session.onTelemetry((frame) => {
      frames.push(frame);
    });
    session.start();

    for (const event of replay.events) {
      while (session.getElapsedMs() + SESSION_DEFAULT_STEP_MS <= event.t * 1000 + Number.EPSILON) {
        session.step(SESSION_DEFAULT_STEP_MS);
      }

      if (event.type === "setAction") {
        session.setAction(event.action);
      } else if (event.type === "setStrategy") {
        session.setStrategy(event.level);
      } else {
        finalScore = session.stop();
      }
    }

    if (finalScore === null) {
      finalScore = session.stop();
    }

    return { frames, finalScore };
  }

  private createKernel(): SimulationKernel {
    return new SimulationKernel({
      seed: this.seed,
      initialStrategyLevel: this.initialStrategyLevel,
    });
  }

  private applyAction(action: ActionType): void {
    if (action === "idle") {
      this.kernel.configureAction("stand");
      return;
    }

    this.kernel.configureAction(action as ActionTemplateId);
  }

  private withSessionFields(frame: TelemetryFrame): TelemetryFrame {
    return {
      ...frame,
      real_t_ms: this.elapsedMs,
      action: this.currentAction,
      session_state: this.state,
    };
  }

  private emitTelemetry(frame: TelemetryFrame): void {
    this.telemetrySubscribers.forEach((subscriber, index) => {
      try {
        subscriber(frame);
      } catch (err) {
        console.error(`Telemetry subscriber ${index} failed`, err);
      }
    });
  }

  private emitState(): void {
    for (const subscriber of this.stateSubscribers) {
      subscriber(this.state);
    }
  }

  private throwIllegal(action: string): never {
    throw new Error(`Cannot ${action} while session state is ${this.state}`);
  }
}

import { afterEach, describe, expect, it, vi } from "vitest";

import { SimulationSession, type SessionReplay } from "../SimulationSession";
import type { TelemetryFrame } from "../types";

function numericFrame(frame: TelemetryFrame): unknown {
  return {
    t: frame.t,
    real_t_ms: frame.real_t_ms,
    q: frame.q,
    dq: frame.dq,
    tau_human: frame.tau_human,
    tau_exo: frame.tau_exo,
    fatigue: frame.fatigue,
    action: frame.action,
    phase: frame.phase,
    strategy_id: frame.strategy_id,
    session_state: frame.session_state,
  };
}

describe("SimulationSession", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("supports the legal lifecycle path", () => {
    const session = new SimulationSession();

    session.start();
    expect(session.getState()).toBe("running");
    session.pause();
    expect(session.getState()).toBe("paused");
    session.resume();
    expect(session.getState()).toBe("running");
    session.stop();
    expect(session.getState()).toBe("stopped");
  });

  it("throws on illegal lifecycle transitions", () => {
    const session = new SimulationSession();

    expect(() => session.pause()).toThrow(/state is idle/);
    session.start();
    expect(() => session.resume()).toThrow(/state is running/);
    session.stop();
    expect(() => session.start()).toThrow(/state is stopped/);
  });

  it("emits telemetry only while running", () => {
    const session = new SimulationSession();
    const frames: TelemetryFrame[] = [];

    session.onTelemetry((frame) => {
      frames.push(frame);
    });
    session.start();
    session.step();
    session.pause();
    expect(() => session.step()).toThrow(/state is paused/);
    session.resume();
    session.step();
    session.stop();
    expect(() => session.step()).toThrow(/state is stopped/);

    expect(frames).toHaveLength(2);
  });

  it("stops sending frames after unsubscribe", () => {
    const session = new SimulationSession();
    const frames: TelemetryFrame[] = [];
    const unsubscribe = session.onTelemetry((frame) => {
      frames.push(frame);
    });

    session.start();
    session.step();
    unsubscribe();
    session.step();

    expect(frames).toHaveLength(1);
  });

  it("keeps later subscribers alive when one throws", () => {
    const session = new SimulationSession();
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    let secondCalled = 0;

    session.onTelemetry(() => {
      throw new Error("boom");
    });
    session.onTelemetry(() => {
      secondCalled += 1;
    });
    session.start();
    session.step();

    expect(secondCalled).toBe(1);
    expect(errSpy.mock.calls[0]?.[0]).toContain("Telemetry subscriber 0 failed");
  });

  it("replays the same event sequence deterministically", () => {
    const replay: SessionReplay = {
      seed: 5,
      initialAction: "walk",
      initialStrategyLevel: 1,
      events: [
        { t: 0.032, type: "setStrategy", level: 3 },
        { t: 0.064, type: "setAction", action: "squat" },
        { t: 0.128, type: "stop" },
      ],
    };

    const first = SimulationSession.replay(replay);
    const second = SimulationSession.replay(replay);

    expect(second.frames.map(numericFrame)).toEqual(first.frames.map(numericFrame));
  });

  it("exports replay data that restores the final score exactly", () => {
    const session = new SimulationSession({ seed: 9, initialAction: "walk", initialStrategyLevel: 2 });

    session.start();
    session.step();
    session.setStrategy(4);
    session.step();
    session.setAction("squat");
    session.step();
    const score = session.stop();
    const replay = SimulationSession.replay(session.exportReplay());

    expect(replay.finalScore.total).toBe(score.total);
  });

  it("can reset and start again with elapsed time cleared", () => {
    const session = new SimulationSession();

    session.start();
    session.step();
    session.reset();
    expect(session.getState()).toBe("idle");
    expect(session.getElapsedMs()).toBe(0);
    session.start();
    expect(session.getState()).toBe("running");
  });
});

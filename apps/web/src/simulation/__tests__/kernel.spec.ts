import { afterEach, describe, expect, it, vi } from "vitest";

import { SimulationKernel } from "../SimulationKernel";
import { Level1Zero } from "../strategies/Level1Zero";
import type { StrategyInput } from "../strategies/Strategy";
import type { TelemetryFrame } from "../types";
import { rad2deg } from "../utils";

function runWalkForFiveSeconds(seed = 42): TelemetryFrame[] {
  const kernel = new SimulationKernel({ seed });
  const frames: TelemetryFrame[] = [];

  kernel.subscribe((frame) => {
    frames.push(frame);
  });
  kernel.playAction("walk");
  vi.advanceTimersByTime(5000);
  kernel.stop();

  return frames;
}

describe("SimulationKernel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("emits at least 290 telemetry frames over five simulated seconds", () => {
    vi.useFakeTimers();

    const frames = runWalkForFiveSeconds();

    expect(frames.length).toBeGreaterThanOrEqual(290);
  });

  it("emits deterministic telemetry for the same seed and action", () => {
    vi.useFakeTimers();

    const firstRun = runWalkForFiveSeconds(7);
    vi.clearAllTimers();
    const secondRun = runWalkForFiveSeconds(7);

    expect(secondRun).toEqual(firstRun);
    expect(firstRun[150]?.timestamp).toBe(2502);
    expect(firstRun[150]?.joints.left_hip).toBeCloseTo(10.490953601691736, 12);
    expect(firstRun[150]?.joints.right_hip).toBeCloseTo(-10.490953601691736, 12);
    expect(firstRun[150]?.step_count).toBe(2);
  });

  it("keeps hip angles near neutral while standing", () => {
    vi.useFakeTimers();
    const kernel = new SimulationKernel();

    kernel.playAction("stand");
    vi.advanceTimersByTime(2000);

    const state = kernel.getState();
    kernel.stop();

    expect(Math.abs(state.leftHip.posRad)).toBeLessThan(0.05);
    expect(Math.abs(state.rightHip.posRad)).toBeLessThan(0.05);
  });

  it("emits finite reference pose fields with telemetry", () => {
    vi.useFakeTimers();
    const frames: TelemetryFrame[] = [];
    const kernel = new SimulationKernel();

    kernel.subscribe((frame) => {
      frames.push(frame);
    });
    kernel.playAction("walk");
    vi.advanceTimersByTime(20);
    kernel.stop();

    const frame = frames.find((item) => !item.final);
    expect(frame).toBeDefined();
    expect(Number.isFinite(frame?.q_ref.left_hip)).toBe(true);
    expect(Number.isFinite(frame?.q_ref.right_hip)).toBe(true);
    expect(Number.isFinite(frame?.dq_ref.left_hip)).toBe(true);
    expect(Number.isFinite(frame?.dq_ref.right_hip)).toBe(true);
  });

  it("emits the same q_ref and dq_ref values passed to the strategy", () => {
    vi.useFakeTimers();
    let latestStrategyInput: StrategyInput | null = null;
    const telemetryPairs: Array<{ frame: TelemetryFrame; input: StrategyInput }> = [];
    const kernel = new SimulationKernel({ initialStrategyLevel: 1 });

    vi.spyOn(Level1Zero.prototype, "computeAssistTorque").mockImplementation((input) => {
      latestStrategyInput = input;
      return { leftHip: 0, rightHip: 0 };
    });

    kernel.subscribe((frame) => {
      if (!frame.final && latestStrategyInput !== null) {
        telemetryPairs.push({ frame, input: latestStrategyInput });
      }
    });
    kernel.playAction("walk");
    vi.advanceTimersByTime(20);
    kernel.stop();

    const pair = telemetryPairs[0];
    expect(pair).toBeDefined();
    if (pair === undefined) {
      throw new Error("expected telemetry and strategy input pair");
    }
    expect(pair.frame.q_ref.left_hip).toBeCloseTo(rad2deg(pair.input.q_ref.leftHip), 12);
    expect(pair.frame.q_ref.right_hip).toBeCloseTo(rad2deg(pair.input.q_ref.rightHip), 12);
    expect(pair.frame.dq_ref.left_hip).toBeCloseTo(rad2deg(pair.input.dq_ref.leftHip), 12);
    expect(pair.frame.dq_ref.right_hip).toBeCloseTo(rad2deg(pair.input.dq_ref.rightHip), 12);
  });
});

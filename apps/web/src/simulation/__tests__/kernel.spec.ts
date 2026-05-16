import { afterEach, describe, expect, it, vi } from "vitest";

import { SimulationKernel } from "../SimulationKernel";
import type { TelemetryFrame } from "../types";

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
});

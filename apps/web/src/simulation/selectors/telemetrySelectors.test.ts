import { describe, expect, it } from "vitest";

import {
  selectQRefVsQSeries,
  selectStamina,
} from "./telemetrySelectors";
import type { TelemetryFrame } from "../types";

function telemetryFrame(overrides: Partial<TelemetryFrame> = {}): TelemetryFrame {
  return {
    timestamp: 1000,
    t: 1,
    real_t_ms: 1000,
    source: "simulated",
    imu: { ax: 0, ay: 0, az: 0, gx: 0, gy: 0, gz: 0 },
    joints: { left_hip: 10, right_hip: -10 },
    q: { left_hip: 10, right_hip: -10 },
    q_ref: { left_hip: 12, right_hip: -12 },
    dq: { left_hip: 1, right_hip: -1 },
    dq_ref: { left_hip: 1.5, right_hip: -1.5 },
    tau_human: { left_hip: 0, right_hip: 0 },
    tau_exo: { left_hip: 0, right_hip: 0 },
    motors: {
      left_hip_torque: 0,
      right_hip_torque: 0,
      left_hip_current: 0,
      right_hip_current: 0,
    },
    fatigue: 0.25,
    action: "walk",
    phase: 0,
    step_count: 0,
    battery: 1,
    assist_mode: "off",
    strategy_id: "level_1_zero",
    ...overrides,
  };
}

describe("telemetry selectors", () => {
  it("selects q_ref vs q series for each active hip joint without unit conversion", () => {
    const frames = [
      telemetryFrame({ t: 1, q: { left_hip: 10, right_hip: -8 }, q_ref: { left_hip: 14, right_hip: -11 } }),
      telemetryFrame({ t: 2, q: { left_hip: 20, right_hip: -18 }, q_ref: { left_hip: 24, right_hip: -21 } }),
    ];

    expect(selectQRefVsQSeries(frames, "leftHip")).toStrictEqual([
      { t: 1, qRef: 14, q: 10 },
      { t: 2, qRef: 24, q: 20 },
    ]);
    expect(selectQRefVsQSeries(frames, "rightHip")).toStrictEqual([
      { t: 1, qRef: -11, q: -8 },
      { t: 2, qRef: -21, q: -18 },
    ]);
  });

  it("returns an empty q_ref vs q series for empty input", () => {
    expect(selectQRefVsQSeries([], "leftHip")).toStrictEqual([]);
  });

  it("skips frames with missing or non-finite q_ref/q fields", () => {
    const brokenFrame = telemetryFrame({
      q_ref: { left_hip: Number.NaN, right_hip: 4 },
    });

    expect(selectQRefVsQSeries([brokenFrame], "leftHip")).toStrictEqual([]);
    expect(selectQRefVsQSeries([brokenFrame], "rightHip")).toStrictEqual([{ t: 1, qRef: 4, q: -10 }]);
  });

  it("selects default stamina when no frame is available", () => {
    expect(selectStamina(undefined)).toStrictEqual({ value: 1, label: "green", percent: 100 });
  });

  it.each([
    [0.49, "green", 51],
    [0.5, "yellow", 50],
    [0.8, "yellow", 20],
    [0.81, "red", 19],
  ] satisfies Array<[number, ReturnType<typeof selectStamina>["label"], number]>)(
    "maps fatigue %s to stamina color and percent",
    (fatigue, label, percent) => {
      expect(selectStamina(telemetryFrame({ fatigue }))).toMatchObject({ label, percent });
    },
  );

  it("clamps stamina values to 0..1", () => {
    expect(selectStamina(telemetryFrame({ fatigue: -1 })).percent).toBe(100);
    expect(selectStamina(telemetryFrame({ fatigue: 2 })).percent).toBe(0);
  });
});

import { describe, expect, it } from "vitest";

import {
  selectQRefVsQSeries,
  selectTauSeries,
  selectStamina,
  selectStaminaSeries,
  formatTelemetryTimeTick,
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

  it("selects tau_human vs tau_exo series for each active hip joint", () => {
    const frames = [
      telemetryFrame({ t: 1, tau_human: { left_hip: 1, right_hip: -2 }, tau_exo: { left_hip: 3, right_hip: -4 } }),
      telemetryFrame({ t: 2, tau_human: { left_hip: 5, right_hip: -6 }, tau_exo: { left_hip: 7, right_hip: -8 } }),
    ];

    expect(selectTauSeries(frames, "leftHip")).toStrictEqual([
      { t: 1, tauHuman: 1, tauExo: 3 },
      { t: 2, tauHuman: 5, tauExo: 7 },
    ]);
    expect(selectTauSeries(frames, "rightHip")).toStrictEqual([
      { t: 1, tauHuman: -2, tauExo: -4 },
      { t: 2, tauHuman: -6, tauExo: -8 },
    ]);
  });

  it("returns an empty tau series for empty input", () => {
    expect(selectTauSeries([], "leftHip")).toStrictEqual([]);
  });

  it("skips frames with missing or non-finite tau fields", () => {
    const brokenFrame = telemetryFrame({
      tau_human: { left_hip: Number.NaN, right_hip: 4 },
      tau_exo: { left_hip: 1, right_hip: 5 },
    });
    const missingFrame = {
      ...telemetryFrame(),
      tau_exo: { left_hip: undefined, right_hip: 5 },
    } as unknown as TelemetryFrame;

    expect(selectTauSeries([brokenFrame], "leftHip")).toStrictEqual([]);
    expect(selectTauSeries([brokenFrame], "rightHip")).toStrictEqual([{ t: 1, tauHuman: 4, tauExo: 5 }]);
    expect(selectTauSeries([missingFrame], "leftHip")).toStrictEqual([]);
  });

  it("formats telemetry time ticks to one decimal place", () => {
    expect(formatTelemetryTimeTick(7.10199999999944)).toBe("7.1");
    expect(formatTelemetryTimeTick("2")).toBe("2.0");
    expect(formatTelemetryTimeTick("not-a-number")).toBe("not-a-number");
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

  it("selects stamina percent over time from telemetry fatigue", () => {
    const frames = [
      telemetryFrame({ t: 1, fatigue: 0 }),
      telemetryFrame({ t: 2, fatigue: 0.25 }),
      telemetryFrame({ t: 3, fatigue: 0.9 }),
    ];

    expect(selectStaminaSeries(frames)).toStrictEqual([
      { t: 1, stamina: 100 },
      { t: 2, stamina: 75 },
      { t: 3, stamina: 10 },
    ]);
  });

  it("returns an empty stamina series for empty or non-finite telemetry", () => {
    const brokenFrame = telemetryFrame({ t: Number.NaN, fatigue: 0.5 });
    const missingFatigueFrame = { ...telemetryFrame(), fatigue: undefined } as unknown as TelemetryFrame;

    expect(selectStaminaSeries([])).toStrictEqual([]);
    expect(selectStaminaSeries([brokenFrame, missingFatigueFrame])).toStrictEqual([]);
  });
});

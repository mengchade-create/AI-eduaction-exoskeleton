import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import StaminaBar from "./StaminaBar";
import type { TelemetryFrame } from "../../simulation/types";

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

describe("StaminaBar", () => {
  it("renders default full stamina when no frame is available", () => {
    const markup = renderToStaticMarkup(<StaminaBar frame={undefined} />);

    expect(markup).toContain("Stamina 100%");
    expect(markup).toContain("bg-green-500");
  });

  it("switches color classes by stamina threshold", () => {
    expect(renderToStaticMarkup(<StaminaBar frame={telemetryFrame()} />)).toContain("bg-green-500");
    expect(renderToStaticMarkup(<StaminaBar frame={telemetryFrame({ fatigue: 0.5 })} />)).toContain("bg-yellow-500");
    expect(renderToStaticMarkup(<StaminaBar frame={telemetryFrame({ fatigue: 0.9 })} />)).toContain("bg-red-600");
  });
});

import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import QRefVsQChart from "./QRefVsQChart";
import type { TelemetryFrame } from "../../simulation/types";

interface MockChartProps {
  children?: ReactNode;
  data?: unknown[];
  name?: string;
}

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: MockChartProps) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children, data }: MockChartProps) => <div data-points={data?.length ?? 0}>{children}</div>,
  XAxis: () => <span>t (s)</span>,
  YAxis: () => <span>deg</span>,
  Legend: () => <span>legend</span>,
  Line: ({ name }: MockChartProps) => <span>{name}</span>,
}));

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

describe("QRefVsQChart", () => {
  it("renders the chart labels and joint selector", () => {
    const frames = [
      telemetryFrame({ q: { left_hip: 10, right_hip: -10 }, q_ref: { left_hip: 12, right_hip: -12 } }),
      telemetryFrame({ q: { left_hip: 11, right_hip: -11 }, q_ref: { left_hip: 13, right_hip: -13 } }),
    ];

    const markup = renderToStaticMarkup(<QRefVsQChart frames={frames} />);

    expect(markup).toContain("q_ref vs q");
    expect(markup).toContain("Left hip");
    expect(markup).toContain("Right hip");
    expect(markup).toContain("q_ref");
    expect(markup).toContain("q");
    expect(markup).toContain("deg");
  });
});

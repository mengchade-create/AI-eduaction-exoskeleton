import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import TauChart from "./TauChart";
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
  YAxis: () => <span>N·m</span>,
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
    tau_human: { left_hip: 2, right_hip: -2 },
    tau_exo: { left_hip: 3, right_hip: -3 },
    motors: {
      left_hip_torque: 3,
      right_hip_torque: -3,
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

describe("TauChart", () => {
  it("renders tau legends and the joint selector", () => {
    const markup = renderToStaticMarkup(<TauChart frames={[telemetryFrame()]} />);

    expect(markup).toContain("tau_human vs tau_exo");
    expect(markup).toContain("Left hip");
    expect(markup).toContain("Right hip");
    expect(markup).toContain("τ_human");
    expect(markup).toContain("τ_exo");
    expect(markup).toContain("N·m");
  });
});

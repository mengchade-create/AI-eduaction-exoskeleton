import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { formatTelemetryTimeTick, selectStaminaSeries } from "../../simulation/selectors/telemetrySelectors";
import type { TelemetryFrame } from "../../simulation/types";

export interface StaminaBarProps {
  frames: TelemetryFrame[];
}

export default function StaminaBar({ frames }: StaminaBarProps) {
  const series = selectStaminaSeries(frames);

  return (
    <section className="rounded border border-slate-200 bg-white p-3">
      <h2 className="text-sm font-semibold text-slate-700">Stamina over time</h2>
      <div className="mt-3 h-40 w-full">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={series}>
            <XAxis
              dataKey="t"
              label={{ value: "t (s)", position: "insideBottom", offset: -2 }}
              tickFormatter={formatTelemetryTimeTick}
            />
            <YAxis domain={[0, 100]} label={{ value: "Stamina (%)", angle: -90, position: "insideLeft" }} />
            <Line dataKey="stamina" dot={false} isAnimationActive={false} name="Stamina" stroke="#22c55e" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

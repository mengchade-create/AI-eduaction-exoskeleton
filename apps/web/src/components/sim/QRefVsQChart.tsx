import { useMemo, useState } from "react";
import { Legend, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

import {
  hasQRefForJoint,
  Q_REF_JOINT_IDS,
  selectQRefVsQSeries,
  type TelemetryJointId,
} from "../../simulation/selectors/telemetrySelectors";
import type { TelemetryFrame } from "../../simulation/types";

const JOINT_LABELS: Record<TelemetryJointId, string> = {
  leftHip: "Left hip",
  rightHip: "Right hip",
};

export interface QRefVsQChartProps {
  frames: TelemetryFrame[];
}

export default function QRefVsQChart({ frames }: QRefVsQChartProps) {
  const [jointId, setJointId] = useState<TelemetryJointId>("leftHip");
  const availableJoints = useMemo(
    () => Q_REF_JOINT_IDS.filter((candidate) => frames.length === 0 || frames.some((frame) => hasQRefForJoint(frame, candidate))),
    [frames],
  );
  const visibleJoint = availableJoints.includes(jointId) ? jointId : availableJoints[0] ?? "leftHip";
  const series = useMemo(() => selectQRefVsQSeries(frames, visibleJoint), [frames, visibleJoint]);

  return (
    <section className="rounded border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-700">q_ref vs q</h2>
        <label className="text-xs font-medium text-slate-600">
          Joint
          <select
            aria-label="q_ref vs q joint"
            className="ml-2 rounded border border-slate-300 bg-white px-2 py-1 text-xs"
            onChange={(event) => setJointId(event.currentTarget.value as TelemetryJointId)}
            value={visibleJoint}
          >
            {availableJoints.map((candidate) => (
              <option key={candidate} value={candidate}>
                {JOINT_LABELS[candidate]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 h-48">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={series}>
            <XAxis dataKey="t" label={{ value: "t (s)", position: "insideBottom", offset: -2 }} />
            <YAxis label={{ value: "deg", angle: -90, position: "insideLeft" }} />
            <Legend />
            <Line
              dataKey="qRef"
              dot={false}
              isAnimationActive={false}
              name="q_ref"
              stroke="#38bdf8"
              strokeDasharray="4 4"
            />
            <Line dataKey="q" dot={false} isAnimationActive={false} name="q" stroke="#2563eb" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

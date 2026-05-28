import { selectStamina } from "../../simulation/selectors/telemetrySelectors";
import type { TelemetryFrame } from "../../simulation/types";

export interface StaminaBarProps {
  frame: TelemetryFrame | undefined;
}

const LABEL_TO_CLASS = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-600",
} as const;

export default function StaminaBar({ frame }: StaminaBarProps) {
  const stamina = selectStamina(frame);
  const fatiguePercent = frame === undefined ? 0 : Math.round(Math.min(1, Math.max(0, frame.fatigue)) * 100);

  return (
    <section className="rounded border border-slate-200 bg-white p-3">
      <h2 className="text-sm font-semibold text-slate-700">Stamina</h2>
      <div className="mt-3 h-3 overflow-hidden rounded bg-slate-200">
        <div
          aria-label="stamina value"
          className={`h-full ${LABEL_TO_CLASS[stamina.label]}`}
          style={{ width: `${stamina.percent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-600">
        Stamina {stamina.percent}% · fatigue {(fatiguePercent / 100).toFixed(2)}
      </p>
    </section>
  );
}

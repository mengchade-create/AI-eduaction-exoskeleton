import type { ScoreBreakdown } from "../../simulation/types";

export interface ScoreBreakdownCardProps {
  score: ScoreBreakdown | null;
}

function formatScore(value: number): string {
  return value.toFixed(2);
}

export default function ScoreBreakdownCard({ score }: ScoreBreakdownCardProps) {
  if (score === null) {
    return (
      <section className="rounded border border-slate-200 bg-white p-3">
        <h2 className="text-sm font-semibold text-slate-700">Score Breakdown</h2>
        <p className="mt-2 text-sm text-slate-500">Run a timed episode to see scoring details.</p>
      </section>
    );
  }

  return (
    <section className="rounded border border-slate-200 bg-white p-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-700">Score Breakdown</h2>
        <span className="text-lg font-bold tabular-nums text-slate-900">{formatScore(score.total)}</span>
      </div>
      <div className="mt-3 space-y-2">
        {score.subscores.map((subscore) => (
          <div className="grid grid-cols-[1fr_auto] gap-3 text-sm" key={subscore.key}>
            <span className="text-slate-700">{subscore.label}</span>
            <span className="tabular-nums text-slate-600">
              {formatScore(subscore.value)} × {formatScore(subscore.weight)} = {formatScore(subscore.contribution)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 border-t border-slate-200 pt-2">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{formatScore(score.total)}</span>
        </div>
      </div>
    </section>
  );
}

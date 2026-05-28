import type { StrategyLevel } from "../../simulation/strategies/Strategy";

export const STRATEGY_LEVEL_OPTIONS: Array<{ level: StrategyLevel; label: string }> = [
  { level: 1, label: "Level 1 — Zero (baseline)" },
  { level: 2, label: "Level 2 — Passive spring" },
  { level: 3, label: "Level 3 — Fixed feedforward" },
  { level: 4, label: "Level 4 — Phase adaptive" },
  { level: 5, label: "Level 5 — Full adaptive" },
];

export function parseStrategyLevel(value: string): StrategyLevel {
  const level = Number(value);

  if (level === 1 || level === 2 || level === 3 || level === 4 || level === 5) {
    return level;
  }

  return 1;
}

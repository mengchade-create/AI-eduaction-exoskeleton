import type { StrategyKey, StrategyLevel } from "../../simulation/strategies/Strategy";

export const STRATEGY_OPTIONS: Array<{ key: StrategyKey; label: string }> = [
  { key: "bad_phase", label: "Bad Phase — adversarial (demo)" },
  { key: 1, label: "Level 1 — Zero (baseline)" },
  { key: 2, label: "Level 2 — Passive spring" },
  { key: 3, label: "Level 3 — Fixed feedforward" },
  { key: 4, label: "Level 4 — Phase adaptive" },
  { key: 5, label: "Level 5 — Full adaptive" },
];

export const STRATEGY_LEVEL_OPTIONS: Array<{ level: Exclude<StrategyLevel, 0>; label: string }> =
  STRATEGY_OPTIONS
    .filter((option): option is { key: Exclude<StrategyLevel, 0>; label: string } => typeof option.key === "number" && option.key !== 0)
    .map((option) => ({ level: option.key, label: option.label }));

export function parseStrategyKey(value: string): StrategyKey {
  if (value === "bad_phase") {
    return "bad_phase";
  }

  const level = Number(value);

  if (level === 1 || level === 2 || level === 3 || level === 4 || level === 5) {
    return level;
  }

  return 1;
}

export function parseStrategyLevel(value: string): Exclude<StrategyLevel, 0> {
  const key = parseStrategyKey(value);

  return typeof key === "number" && key !== 0 ? key : 1;
}

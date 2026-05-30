import type { StrategyKey, StrategyLevel } from "../../simulation/strategies/Strategy";

export const STRATEGY_OPTIONS: Array<{ key: Exclude<StrategyLevel, 0>; label: string }> = [
  { key: 1, label: "Level 1" },
  { key: 2, label: "Level 2" },
  { key: 3, label: "Level 3" },
  { key: 4, label: "Level 4" },
  { key: 5, label: "Level 5" },
];

export const ADVERSARIAL_STRATEGY_OPTION: { key: Extract<StrategyKey, "bad_phase">; label: string } = {
  key: "bad_phase",
  label: "Adversarial demo: bad_phase",
};

export const STRATEGY_LEVEL_OPTIONS: Array<{ level: Exclude<StrategyLevel, 0>; label: string }> =
  STRATEGY_OPTIONS.map((option) => ({ level: option.key, label: option.label }));

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

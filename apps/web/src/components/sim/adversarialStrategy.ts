import type { StrategyKey } from "../../simulation/strategies/Strategy";

export function isAdversarialStrategy(key: StrategyKey): boolean {
  return key === "bad_phase";
}

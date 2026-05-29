import type { StrategyKey } from "../../simulation/strategies/Strategy";
import type { ActionTemplateId } from "../../simulation/types";

export interface BadDemoPreset {
  strategyKey: StrategyKey;
  seed: number;
  durationS: number;
  action: ActionTemplateId;
}

export const BAD_DEMO_PRESET: BadDemoPreset = {
  strategyKey: "bad_phase",
  seed: 42,
  durationS: 12,
  action: "squat",
};

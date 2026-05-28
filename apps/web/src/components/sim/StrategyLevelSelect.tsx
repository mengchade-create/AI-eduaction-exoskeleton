import type { ChangeEvent } from "react";

import type { StrategyLevel } from "../../simulation/strategies/Strategy";
import { parseStrategyLevel, STRATEGY_LEVEL_OPTIONS } from "./strategyLevelOptions";

export interface StrategyLevelSelectProps {
  value: StrategyLevel;
  onChange: (level: StrategyLevel) => void;
}

export default function StrategyLevelSelect({ value, onChange }: StrategyLevelSelectProps) {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange(parseStrategyLevel(event.currentTarget.value));
  };

  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">Strategy</span>
      <select
        aria-label="Strategy"
        className="mt-3 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        onChange={handleChange}
        value={value}
      >
        {STRATEGY_LEVEL_OPTIONS.map((option) => (
          <option key={option.level} value={option.level}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

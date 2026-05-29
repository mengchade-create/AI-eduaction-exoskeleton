import type { ChangeEvent } from "react";

import type { StrategyKey } from "../../simulation/strategies/Strategy";
import { parseStrategyKey, STRATEGY_OPTIONS } from "./strategyLevelOptions";

export interface StrategyLevelSelectProps {
  value: StrategyKey;
  onChange: (key: StrategyKey) => void;
}

export default function StrategyLevelSelect({ value, onChange }: StrategyLevelSelectProps) {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange(parseStrategyKey(event.currentTarget.value));
  };

  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">Strategy</span>
      <select
        aria-label="Strategy"
        className="mt-3 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        onChange={handleChange}
        value={String(value)}
      >
        {STRATEGY_OPTIONS.map((option) => (
          <option key={option.key} value={String(option.key)}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

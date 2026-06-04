import type { ChangeEvent } from "react";

import type { StrategyKey } from "../../simulation/strategies/Strategy";
import { ADVERSARIAL_STRATEGY_OPTION, parseStrategyKey, STRATEGY_OPTIONS } from "./strategyLevelOptions";

export interface StrategyLevelSelectProps {
  isAdversarialActive?: boolean;
  value: StrategyKey;
  onChange: (key: StrategyKey) => void;
}

export default function StrategyLevelSelect({ isAdversarialActive = false, value, onChange }: StrategyLevelSelectProps) {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange(parseStrategyKey(event.currentTarget.value));
  };

  const selectValue = typeof value === "number" && value >= 1 && value <= 5 ? String(value) : "1";

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="text-sm font-semibold text-slate-700">Strategy</span>
        <select
          aria-label="Strategy"
          className="mt-3 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          onChange={handleChange}
          value={selectValue}
        >
          {STRATEGY_OPTIONS.map((option) => (
            <option key={option.key} value={String(option.key)}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {isAdversarialActive ? (
        <p className="text-xs font-semibold text-red-700">{ADVERSARIAL_STRATEGY_OPTION.label}</p>
      ) : (
        <button
          className="text-left text-xs font-medium text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-red-700"
          onClick={() => onChange(ADVERSARIAL_STRATEGY_OPTION.key)}
          type="button"
        >
          Use bad_phase demo
        </button>
      )}
    </div>
  );
}

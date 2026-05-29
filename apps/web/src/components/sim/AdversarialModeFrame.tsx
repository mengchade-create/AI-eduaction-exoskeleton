import type { ReactNode } from "react";

import type { StrategyKey } from "../../simulation/strategies/Strategy";
import { isAdversarialStrategy } from "./adversarialStrategy";

export interface AdversarialModeFrameProps {
  strategyKey: StrategyKey;
  children: ReactNode;
}

export default function AdversarialModeFrame({ strategyKey, children }: AdversarialModeFrameProps) {
  const isAdversarial = isAdversarialStrategy(strategyKey);
  const frameClassName = [
    "relative flex h-screen flex-col bg-sky-100 text-slate-900",
    isAdversarial ? "ring-4 ring-inset ring-red-600" : "",
  ].filter(Boolean).join(" ");

  return (
    <main className={frameClassName} data-adversarial={isAdversarial ? "true" : "false"} data-testid="sim-root-frame">
      {isAdversarial ? (
        <div
          className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-lg"
          data-testid="adversarial-mode-badge"
        >
          ADVERSARIAL MODE
        </div>
      ) : null}
      {children}
    </main>
  );
}

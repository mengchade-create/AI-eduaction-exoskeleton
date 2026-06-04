import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { SimulationKernel } from "../../simulation/SimulationKernel";
import type { StrategyKey } from "../../simulation/strategies/Strategy";
import BadDemoButton from "./BadDemoButton";
import { BAD_DEMO_PRESET, type BadDemoPreset } from "./badDemoPreset";
import StrategyLevelSelect from "./StrategyLevelSelect";

function findElementByType(element: ReactNode, type: string): ReactElement {
  if (element === null || typeof element !== "object" || !("type" in element)) {
    throw new Error(`Unable to find ${type}`);
  }

  if (element.type === type) {
    return element;
  }

  const props = element.props as { children?: ReactNode };
  const children = Array.isArray(props.children) ? props.children : [props.children];

  for (const child of children) {
    if (child === undefined) {
      continue;
    }

    try {
      return findElementByType(child, type);
    } catch {
      // Keep searching siblings.
    }
  }

  throw new Error(`Unable to find ${type}`);
}

function scorePreset(preset: BadDemoPreset): number {
  const kernel = new SimulationKernel({
    seed: preset.seed,
    initialStrategyLevel: preset.strategyKey,
  });

  kernel.configureAction(preset.action);
  kernel.advanceBy(preset.durationS * 1000);
  return kernel.stop().total;
}

describe("BadDemoButton", () => {
  it("clicking Bad Demo applies bad_phase, seed 42, and duration 12", () => {
    const markup = renderToStaticMarkup(<BadDemoButton onApply={() => undefined} />);
    const onApply = vi.fn();
    const element = BadDemoButton({ onApply });
    const button = findElementByType(element, "button");
    const props = button.props as { onClick: () => void };

    expect(markup).toContain("Bad Demo");
    expect(markup).toContain("bg-red-600");

    props.onClick();

    expect(onApply).toHaveBeenCalledWith({
      strategyKey: "bad_phase",
      seed: 42,
      durationS: 12,
      action: "squat",
    });
  });

  it("the Bad Demo preset scores near the canonical bad_phase squat run", () => {
    expect(scorePreset(BAD_DEMO_PRESET)).toBeCloseTo(0.7066, 4);
  });

  it("changing the strategy dropdown after Bad Demo can switch back to a numeric level", () => {
    let strategyKey: StrategyKey = 1;
    const button = BadDemoButton({
      onApply: (preset) => {
        strategyKey = preset.strategyKey;
      },
    });
    const buttonProps = findElementByType(button, "button").props as { onClick: () => void };

    buttonProps.onClick();
    expect(strategyKey).toBe("bad_phase");

    const select = findElementByType(
      StrategyLevelSelect({
        value: strategyKey,
        onChange: (key) => {
          strategyKey = key;
        },
      }),
      "select",
    );
    const selectProps = select.props as {
      onChange: (event: { currentTarget: { value: string } }) => void;
    };

    selectProps.onChange({ currentTarget: { value: "3" } });

    expect(strategyKey).toBe(3);
  });
});

import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { StrategyKey } from "../../simulation/strategies/Strategy";
import AdversarialModeFrame from "./AdversarialModeFrame";
import BadDemoButton from "./BadDemoButton";
import { isAdversarialStrategy } from "./adversarialStrategy";
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

function renderFrame(strategyKey: StrategyKey): string {
  return renderToStaticMarkup(
    <AdversarialModeFrame strategyKey={strategyKey}>
      <span>sim body</span>
    </AdversarialModeFrame>,
  );
}

describe("AdversarialModeFrame", () => {
  it("identifies bad_phase as adversarial and numeric levels as non-adversarial", () => {
    expect(isAdversarialStrategy("bad_phase")).toBe(true);

    for (const level of [1, 2, 3, 4, 5] as const) {
      expect(isAdversarialStrategy(level)).toBe(false);
    }
  });

  it("renders the adversarial badge and red frame only for bad_phase", () => {
    const adversarialMarkup = renderFrame("bad_phase");
    const baselineMarkup = renderFrame(1);

    expect(adversarialMarkup).toContain("ADVERSARIAL MODE");
    expect(adversarialMarkup).toContain("ring-red-600");
    expect(adversarialMarkup).toContain('data-adversarial="true"');
    expect(baselineMarkup).not.toContain("ADVERSARIAL MODE");
    expect(baselineMarkup).not.toContain("ring-red-600");
    expect(baselineMarkup).toContain('data-adversarial="false"');
  });

  it("shows the badge after Bad Demo and hides it after switching to a numeric level", () => {
    let strategyKey: StrategyKey = 1;

    expect(renderFrame(strategyKey)).not.toContain("ADVERSARIAL MODE");

    const badDemoButton = BadDemoButton({
      onApply: (preset) => {
        strategyKey = preset.strategyKey;
      },
    });
    const buttonProps = findElementByType(badDemoButton, "button").props as { onClick: () => void };

    buttonProps.onClick();

    expect(renderFrame(strategyKey)).toContain("ADVERSARIAL MODE");

    const strategySelect = StrategyLevelSelect({
      value: strategyKey,
      onChange: (key) => {
        strategyKey = key;
      },
    });
    const selectProps = findElementByType(strategySelect, "select").props as {
      onChange: (event: { currentTarget: { value: string } }) => void;
    };

    selectProps.onChange({ currentTarget: { value: "2" } });

    expect(renderFrame(strategyKey)).not.toContain("ADVERSARIAL MODE");
  });
});

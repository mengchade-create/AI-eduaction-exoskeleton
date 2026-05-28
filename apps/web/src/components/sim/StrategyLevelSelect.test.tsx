import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import StrategyLevelSelect from "./StrategyLevelSelect";
import { parseStrategyLevel, STRATEGY_LEVEL_OPTIONS } from "./strategyLevelOptions";

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

describe("StrategyLevelSelect", () => {
  it("renders all five strategy options with level 1 selected by default", () => {
    const markup = renderToStaticMarkup(<StrategyLevelSelect onChange={() => undefined} value={1} />);

    expect(markup).toContain("Strategy");
    for (const option of STRATEGY_LEVEL_OPTIONS) {
      expect(markup).toContain(option.label);
    }
    expect(markup).toContain('value="1" selected=""');
  });

  it("calls onChange with the parsed strategy level", () => {
    const onChange = vi.fn();
    const element = StrategyLevelSelect({ onChange, value: 1 });
    const select = findElementByType(element, "select");
    const props = select.props as {
      onChange: (event: { currentTarget: { value: string } }) => void;
    };

    props.onChange({ currentTarget: { value: "4" } });

    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("falls back to level 1 for invalid values", () => {
    expect(parseStrategyLevel("5")).toBe(5);
    expect(parseStrategyLevel("nope")).toBe(1);
  });
});

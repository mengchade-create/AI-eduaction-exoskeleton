import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import StrategyLevelSelect from "./StrategyLevelSelect";
import { ADVERSARIAL_STRATEGY_OPTION, parseStrategyKey, parseStrategyLevel, STRATEGY_LEVEL_OPTIONS, STRATEGY_OPTIONS } from "./strategyLevelOptions";

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

function collectElementsByType(element: ReactNode, type: string, out: ReactElement[] = []): ReactElement[] {
  if (element === null || typeof element !== "object" || !("type" in element)) {
    return out;
  }

  if (element.type === type) {
    out.push(element);
  }

  const props = element.props as { children?: ReactNode };
  const children = Array.isArray(props.children) ? props.children : [props.children];

  for (const child of children) {
    collectElementsByType(child, type, out);
  }

  return out;
}

describe("StrategyLevelSelect", () => {
  it("renders exactly the five quantitative level options with level 1 selected by default", () => {
    const markup = renderToStaticMarkup(<StrategyLevelSelect onChange={() => undefined} value={1} />);
    const element = StrategyLevelSelect({ onChange: () => undefined, value: 1 });
    const options = collectElementsByType(element, "option");

    expect(markup).toContain("Strategy");
    expect(options.map((option) => option.props.children)).toEqual(STRATEGY_OPTIONS.map((option) => option.label));
    expect(options.map((option) => option.props.value)).toEqual(["1", "2", "3", "4", "5"]);
    for (const option of STRATEGY_OPTIONS) {
      expect(markup).toContain(option.label);
    }
    expect(markup).toContain(ADVERSARIAL_STRATEGY_OPTION.label);
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

  it("uses the secondary adversarial control for bad_phase", () => {
    const onChange = vi.fn();
    const element = StrategyLevelSelect({ onChange, value: 1 });
    const buttons = collectElementsByType(element, "button");
    const button = buttons.find((candidate) => candidate.props.children === ADVERSARIAL_STRATEGY_OPTION.label);
    const props = button?.props as { onClick: () => void };

    expect(button).toBeDefined();
    props.onClick();

    expect(onChange).toHaveBeenCalledWith("bad_phase");
  });

  it("falls back to level 1 for invalid values", () => {
    expect(parseStrategyKey("bad_phase")).toBe("bad_phase");
    expect(parseStrategyLevel("5")).toBe(5);
    expect(STRATEGY_LEVEL_OPTIONS).toHaveLength(5);
    expect(parseStrategyLevel("nope")).toBe(1);
  });
});

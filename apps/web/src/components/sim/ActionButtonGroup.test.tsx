import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DEFAULT_PASSIVE_JOINTS } from "../../scene/passiveJoints";
import type { TelemetryFrame } from "../../simulation/types";
import AdversarialModeFrame from "./AdversarialModeFrame";
import ActionButtonGroup, { type SimActionButtonAction } from "./ActionButtonGroup";
import { BAD_DEMO_PRESET } from "./badDemoPreset";
import { selectSimRigFrame } from "../../pages/simRigFrame";

function findElementsByType(element: ReactNode, type: string): ReactElement[] {
  if (element === null || element === undefined || typeof element !== "object" || !("type" in element)) {
    return [];
  }

  const matches = element.type === type ? [element as ReactElement] : [];
  const props = element.props as { children?: ReactNode };
  const children = Array.isArray(props.children) ? props.children : [props.children];

  for (const child of children) {
    matches.push(...findElementsByType(child, type));
  }

  return matches;
}

function frameWithQRef(leftHip: number, rightHip = leftHip, t = 0): TelemetryFrame {
  return {
    t,
    q_ref: {
      left_hip: leftHip,
      right_hip: rightHip,
    },
  } as TelemetryFrame;
}

describe("ActionButtonGroup", () => {
  it("uses stand as the neutral rig frame source", () => {
    const frame = selectSimRigFrame("stand", frameWithQRef(25, -25), {
      leftHipDeg: 0,
      rightHipDeg: 0,
      passiveJoints: DEFAULT_PASSIVE_JOINTS,
    });

    expect(frame.leftHipDeg).toBe(0);
    expect(frame.rightHipDeg).toBe(0);
    expect(frame.passiveJoints).toEqual(DEFAULT_PASSIVE_JOINTS);
    expect(frame.stance).toBe("both");
  });

  it("switches between Stand, Walk, and Squat and marks the active button", () => {
    const selected: SimActionButtonAction[] = [];
    const element = ActionButtonGroup({
      activeAction: "walk",
      onAction: (action) => {
        selected.push(action);
      },
    });
    const buttons = findElementsByType(element, "button");

    expect(buttons).toHaveLength(3);
    expect(renderToStaticMarkup(element)).toContain('data-testid="action-walk-btn"');
    expect(renderToStaticMarkup(element)).toContain('aria-pressed="true"');

    for (const button of buttons) {
      const props = button.props as { onClick: () => void };
      props.onClick();
    }

    expect(selected).toEqual(["stand", "walk", "squat"]);
  });

  it("marks Squat active for the Bad Demo preset action", () => {
    const markup = renderToStaticMarkup(
      <ActionButtonGroup activeAction={BAD_DEMO_PRESET.action} onAction={() => undefined} />,
    );

    expect(BAD_DEMO_PRESET.action).toBe("squat");
    expect(markup).toContain('data-testid="action-squat-btn"');
    expect(markup).toContain('aria-pressed="true"');
  });

  it("shows the adversarial badge independently of the selected action", () => {
    const adversarialMarkup = renderToStaticMarkup(
      <AdversarialModeFrame strategyKey="bad_phase">
        <ActionButtonGroup activeAction="stand" onAction={() => undefined} />
      </AdversarialModeFrame>,
    );
    const baselineMarkup = renderToStaticMarkup(
      <AdversarialModeFrame strategyKey={1}>
        <ActionButtonGroup activeAction="squat" onAction={() => undefined} />
      </AdversarialModeFrame>,
    );

    expect(adversarialMarkup).toContain("ADVERSARIAL MODE");
    expect(baselineMarkup).not.toContain("ADVERSARIAL MODE");
  });
});

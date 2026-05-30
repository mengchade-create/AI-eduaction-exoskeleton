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

function walkFrameAtTime(t: number): TelemetryFrame {
  const leftHip = 25 * Math.sin(2 * Math.PI * t);
  const leftHipVelocity = 25 * 2 * Math.PI * Math.cos(2 * Math.PI * t);

  return {
    ...frameWithQRef(leftHip, -leftHip, t),
    dq_ref: {
      left_hip: leftHipVelocity,
      right_hip: -leftHipVelocity,
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

  it("resets the squat pose to the first animation frame on action change", () => {
    const staleWalkFrame = frameWithQRef(25, -25, 7);
    const buttonSquatFrame = selectSimRigFrame(
      "squat",
      staleWalkFrame,
      {
        leftHipDeg: 0,
        rightHipDeg: 0,
        passiveJoints: DEFAULT_PASSIVE_JOINTS,
      },
      0,
    );
    const badDemoSquatFrame = selectSimRigFrame(
      "squat",
      undefined,
      {
        leftHipDeg: 0,
        rightHipDeg: 0,
        passiveJoints: DEFAULT_PASSIVE_JOINTS,
      },
      0,
    );

    expect(buttonSquatFrame).toEqual(badDemoSquatFrame);
    expect(buttonSquatFrame.passiveJoints).toEqual(DEFAULT_PASSIVE_JOINTS);
  });

  it("advances the squat passive pose from the reset phase after action change", () => {
    const resetFrame = selectSimRigFrame(
      "squat",
      frameWithQRef(25, -25, 7),
      {
        leftHipDeg: 0,
        rightHipDeg: 0,
        passiveJoints: DEFAULT_PASSIVE_JOINTS,
      },
      0,
    );
    const midSquatFrame = selectSimRigFrame(
      "squat",
      frameWithQRef(25, -25, 8),
      {
        leftHipDeg: 0,
        rightHipDeg: 0,
        passiveJoints: DEFAULT_PASSIVE_JOINTS,
      },
      1,
    );

    expect(resetFrame.passiveJoints.leftKnee).toBe(0);
    expect(midSquatFrame.passiveJoints.leftKnee).toBeGreaterThan(resetFrame.passiveJoints.leftKnee);
  });

  it("adds non-constant passive knee and ankle motion for walk", () => {
    const neutralWalkFrame = selectSimRigFrame(
      "walk",
      walkFrameAtTime(0),
      {
        leftHipDeg: 0,
        rightHipDeg: 0,
        passiveJoints: DEFAULT_PASSIVE_JOINTS,
      },
      0,
    );
    const swingWalkFrame = selectSimRigFrame(
      "walk",
      walkFrameAtTime(0.075),
      {
        leftHipDeg: 0,
        rightHipDeg: 0,
        passiveJoints: DEFAULT_PASSIVE_JOINTS,
      },
      0.075,
    );

    expect(neutralWalkFrame.passiveJoints.leftKnee).toBeGreaterThan(0);
    expect(swingWalkFrame.passiveJoints.leftKnee).not.toBe(neutralWalkFrame.passiveJoints.leftKnee);
    expect(swingWalkFrame.passiveJoints.leftAnkle).not.toBe(neutralWalkFrame.passiveJoints.leftAnkle);
  });

  it("maps left hip flexion peak to heel strike with a nearly straight knee", () => {
    const frame = selectSimRigFrame(
      "walk",
      walkFrameAtTime(0.25),
      {
        leftHipDeg: 0,
        rightHipDeg: 0,
        passiveJoints: DEFAULT_PASSIVE_JOINTS,
      },
      0.25,
    );

    expect(frame.leftHipDeg).toBeGreaterThan(24);
    expect(frame.passiveJoints.leftKnee * (180 / Math.PI)).toBeLessThanOrEqual(10);
  });

  it("maps left hip extension peak to toe-off with left knee flexed and right knee near straight", () => {
    const frame = selectSimRigFrame(
      "walk",
      walkFrameAtTime(0.75),
      {
        leftHipDeg: 0,
        rightHipDeg: 0,
        passiveJoints: DEFAULT_PASSIVE_JOINTS,
      },
      0.75,
    );

    expect(frame.leftHipDeg).toBeLessThan(-24);
    expect(frame.passiveJoints.leftKnee * (180 / Math.PI)).toBeGreaterThanOrEqual(30);
    expect(frame.passiveJoints.rightKnee * (180 / Math.PI)).toBeLessThanOrEqual(10);
  });

  it("puts left ankle push-off plantarflexion near the bottom third of left hip range", () => {
    let minAnkle = Number.POSITIVE_INFINITY;
    let hipAtMinAnkle = 0;

    for (let index = 0; index < 360; index += 1) {
      const t = index / 360;
      const telemetryFrame = walkFrameAtTime(t);
      const frame = selectSimRigFrame(
        "walk",
        telemetryFrame,
        {
          leftHipDeg: 0,
          rightHipDeg: 0,
          passiveJoints: DEFAULT_PASSIVE_JOINTS,
        },
        t,
      );
      const ankleDeg = frame.passiveJoints.leftAnkle * (180 / Math.PI);

      if (ankleDeg < minAnkle) {
        minAnkle = ankleDeg;
        hipAtMinAnkle = telemetryFrame.q_ref.left_hip;
      }
    }

    expect(minAnkle).toBeLessThan(-10);
    expect(hipAtMinAnkle).toBeLessThanOrEqual(-25 / 3);
  });

  it("keeps stand passive joints near-constant", () => {
    const standFrame = selectSimRigFrame("stand", frameWithQRef(25, -25, 9), {
      leftHipDeg: 0,
      rightHipDeg: 0,
      passiveJoints: DEFAULT_PASSIVE_JOINTS,
    });

    expect(standFrame.passiveJoints).toEqual(DEFAULT_PASSIVE_JOINTS);
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

/**
 * BASELINE LOCK TEST
 *
 * If this test fails, you are changing default numerical behavior.
 * Either:
 *   (a) the change is intentional -> update the constants below in the same PR,
 *       and explain why in the PR body.
 *   (b) the change is accidental -> fix it before merging.
 *
 * Do NOT silently update these constants to make CI green.
 */
import { describe, expect, it } from "vitest";

import { SimulationSession } from "../SimulationSession";

const BASELINE_FINAL_SCORE_TOTAL = 20.08266486604268;
const BASELINE_FRAME_60_Q_LEFT_HIP = 74.97822398354363;
const BASELINE_FRAME_60_Q_RIGHT_HIP = 74.97822398354363;
const BASELINE_FRAME_60_FATIGUE = 0.02501046141977655;
const BASELINE_FRAME_COUNT = 750;

describe("simulation baseline lock", () => {
  it("locks the default squat level 3 numerical baseline", () => {
    const session = new SimulationSession({
      seed: 0,
      initialAction: "squat",
      initialStrategyLevel: 3,
    });
    const frames = [];

    session.start();
    for (let i = 0; i < BASELINE_FRAME_COUNT; i += 1) {
      frames.push(session.step());
    }

    const finalScore = session.stop();
    const frame60 = frames[59];

    expect(finalScore.total).toBe(BASELINE_FINAL_SCORE_TOTAL);
    expect(frame60.q.left_hip).toBe(BASELINE_FRAME_60_Q_LEFT_HIP);
    expect(frame60.q.right_hip).toBe(BASELINE_FRAME_60_Q_RIGHT_HIP);
    expect(frame60.fatigue).toBe(BASELINE_FRAME_60_FATIGUE);
    expect(frames.length).toBe(BASELINE_FRAME_COUNT);
  });
});

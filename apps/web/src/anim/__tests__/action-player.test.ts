import { describe, expect, it } from "vitest";

import { createActionPlaybackController } from "../useActionPlayer";
import { squatTemplate } from "../templates/squat";

describe("action playback controller", () => {
  it("starts and stops playback", () => {
    const controller = createActionPlaybackController(squatTemplate);

    expect(controller.getState().isPlaying).toBe(false);
    expect(controller.play(100).isPlaying).toBe(true);
    expect(controller.stop().isPlaying).toBe(false);
    expect(controller.getState().currentFrame.active.left_hip).toBe(0);
  });

  it("advances progress and auto-stops at template end", () => {
    const controller = createActionPlaybackController(squatTemplate);

    controller.play(1000);
    const midState = controller.tick(2000);

    expect(midState.isPlaying).toBe(true);
    expect(midState.currentFrame.active.left_hip).toBeCloseTo(70, 1);

    const endState = controller.tick(3000);

    expect(endState.isPlaying).toBe(false);
    expect(endState.currentFrame.active.left_hip).toBe(0);
    expect(endState.currentFrame.passive.leftKnee).toBe(0);
  });
});

import { useCallback, useEffect, useRef, useState } from "react";

import type { ActionFrame, ActionTemplate } from "./ActionTemplate";

export type ActionPlaybackState = {
  isPlaying: boolean;
  currentFrame: ActionFrame;
};

export type ActionPlaybackController = {
  getState(): ActionPlaybackState;
  play(nowMs: number): ActionPlaybackState;
  stop(): ActionPlaybackState;
  tick(nowMs: number): ActionPlaybackState;
};

export function createActionPlaybackController(template: ActionTemplate): ActionPlaybackController {
  let startMs = 0;
  let state: ActionPlaybackState = {
    isPlaying: false,
    currentFrame: template.sample(0),
  };

  return {
    getState() {
      return state;
    },
    play(nowMs: number) {
      startMs = nowMs;
      state = {
        isPlaying: true,
        currentFrame: template.sample(0),
      };

      return state;
    },
    stop() {
      state = {
        isPlaying: false,
        currentFrame: template.sample(0),
      };

      return state;
    },
    tick(nowMs: number) {
      if (!state.isPlaying) {
        return state;
      }

      const t = (nowMs - startMs) / template.durationMs;
      if (t >= 1) {
        return this.stop();
      }

      state = {
        isPlaying: true,
        currentFrame: template.sample(t),
      };

      return state;
    },
  };
}

export function useActionPlayer(template: ActionTemplate) {
  const controllerRef = useRef(createActionPlaybackController(template));
  const rafIdRef = useRef<number | null>(null);
  const [playbackState, setPlaybackState] = useState<ActionPlaybackState>(() => controllerRef.current.getState());

  const cancelPendingFrame = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const tick = useCallback((nowMs: number) => {
    // SPEC §3.5.2: rAF only samples ActionTemplate pose channels; it does not enter the simulation control loop.
    const nextState = controllerRef.current.tick(nowMs);
    setPlaybackState(nextState);

    if (nextState.isPlaying) {
      rafIdRef.current = requestAnimationFrame(tick);
    } else {
      rafIdRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    cancelPendingFrame();
    setPlaybackState(controllerRef.current.stop());
  }, [cancelPendingFrame]);

  const play = useCallback(() => {
    cancelPendingFrame();
    const startMs = performance.now();
    setPlaybackState(controllerRef.current.play(startMs));
    rafIdRef.current = requestAnimationFrame(tick);
  }, [cancelPendingFrame, tick]);

  useEffect(() => {
    return cancelPendingFrame;
  }, [cancelPendingFrame]);

  return {
    isPlaying: playbackState.isPlaying,
    currentFrame: playbackState.currentFrame,
    play,
    stop,
  };
}

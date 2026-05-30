import { computeFootY, type LegAngles } from "./grounding";
import type { LegGeometry } from "./rigGeometry";

export const FOOT_GROUND_LOCK_RELEASE_ALPHA = 0.25;

export function computeFootContactWorldY(
  leg: LegAngles,
  geom: LegGeometry,
  hipHeight: number,
  rootY: number,
): number {
  // Contact reference: ankle-centered foot sole point used by the FK grounding model.
  // This matches RIG_GEOMETRY.footHeight rather than attempting per-corner foot mesh contact.
  return rootY + hipHeight + computeFootY(leg, geom);
}

export function computeFootGroundLockLiftY(
  leftLeg: LegAngles,
  rightLeg: LegAngles,
  geom: LegGeometry,
  hipHeight: number,
  rootY: number,
): number {
  const leftFootY = computeFootContactWorldY(leftLeg, geom, hipHeight, rootY);
  const rightFootY = computeFootContactWorldY(rightLeg, geom, hipHeight, rootY);

  return Math.max(0, -Math.min(leftFootY, rightFootY, 0));
}

export type RootLiftSmoother = {
  next: (rawLiftY: number) => number;
  reset: () => void;
};

export function createRootLiftSmoother(releaseAlpha = FOOT_GROUND_LOCK_RELEASE_ALPHA): RootLiftSmoother {
  let currentLiftY: number | null = null;

  return {
    next(rawLiftY: number) {
      const clampedRawLiftY = Math.max(0, rawLiftY);

      if (currentLiftY === null || clampedRawLiftY > currentLiftY) {
        currentLiftY = clampedRawLiftY;
        return currentLiftY;
      }

      currentLiftY += (clampedRawLiftY - currentLiftY) * releaseAlpha;
      return currentLiftY;
    },
    reset() {
      currentLiftY = null;
    },
  };
}

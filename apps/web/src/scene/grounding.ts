import type { LegGeometry } from "./rigGeometry";

/**
 * Grounding math utilities operate in the **sagittal plane** (forward/back
 * displacement of the body in its own frame of reference). They are
 * intentionally axis-agnostic and do not know about three.js axes.
 *
 * Mapping to scene coordinates is the Rig layer's responsibility:
 * because hip rotation in Rig.tsx is applied as `rotation={[theta, 0, 0]}`
 * (rotation around the X axis), forward/back displacement falls on the
 * **Z axis** of the scene, with a sign flip. See Rig.tsx for the
 * `pelvisOffsetZ = -computePelvisOffsetSagittal(...)` conversion.
 */

export type StanceFoot = "both" | "left" | "right";

export type LegAngles = {
  hip: number;
  knee: number;
  ankle: number;
};

export function computeFootY(leg: LegAngles, geom: LegGeometry): number {
  const hipAngle = leg.hip;
  const shinAngle = leg.hip - leg.knee;

  const thighDropY = -geom.thighLength * Math.cos(hipAngle);
  const shinDropY = -geom.shinLength * Math.cos(shinAngle);
  const footDropY = -geom.footHeight * Math.cos(shinAngle - leg.ankle);

  return thighDropY + shinDropY + footDropY;
}

export function computeFootSagittal(leg: LegAngles, geom: LegGeometry): number {
  const hipAngle = leg.hip;
  const shinAngle = leg.hip - leg.knee;

  const thighForwardX = geom.thighLength * Math.sin(hipAngle);
  const shinForwardX = geom.shinLength * Math.sin(shinAngle);
  const footForwardX = geom.footHeight * Math.sin(shinAngle - leg.ankle);

  return thighForwardX + shinForwardX + footForwardX;
}

export function computePelvisOffsetSagittal(
  leftLeg: LegAngles,
  rightLeg: LegAngles,
  stance: StanceFoot,
  geom: LegGeometry,
  restFootSagittal: number,
): number {
  const footLeft = computeFootSagittal(leftLeg, geom);
  const footRight = computeFootSagittal(rightLeg, geom);

  let groundRefSagittal: number;
  switch (stance) {
    case "left":
      groundRefSagittal = footLeft;
      break;
    case "right":
      groundRefSagittal = footRight;
      break;
    case "both":
    default:
      groundRefSagittal = (footLeft + footRight) / 2;
      break;
  }

  return restFootSagittal - groundRefSagittal;
}

export function computePelvisOffsetY(
  leftLeg: LegAngles,
  rightLeg: LegAngles,
  stance: StanceFoot,
  geom: LegGeometry,
  restFootY: number,
): number {
  const footYL = computeFootY(leftLeg, geom);
  const footYR = computeFootY(rightLeg, geom);

  let groundRefY: number;
  switch (stance) {
    case "left":
      groundRefY = footYL;
      break;
    case "right":
      groundRefY = footYR;
      break;
    case "both":
    default:
      groundRefY = Math.max(footYL, footYR);
      break;
  }

  return restFootY - groundRefY;
}

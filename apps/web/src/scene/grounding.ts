import type { LegGeometry } from "./rigGeometry";

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

export function computeFootX(leg: LegAngles, geom: LegGeometry): number {
  const hipAngle = leg.hip;
  const shinAngle = leg.hip - leg.knee;

  const thighForwardX = geom.thighLength * Math.sin(hipAngle);
  const shinForwardX = geom.shinLength * Math.sin(shinAngle);
  const footForwardX = geom.footHeight * Math.sin(shinAngle - leg.ankle);

  return thighForwardX + shinForwardX + footForwardX;
}

export function computePelvisOffsetX(
  leftLeg: LegAngles,
  rightLeg: LegAngles,
  stance: StanceFoot,
  geom: LegGeometry,
  restFootX: number,
): number {
  const footXL = computeFootX(leftLeg, geom);
  const footXR = computeFootX(rightLeg, geom);

  let groundRefX: number;
  switch (stance) {
    case "left":
      groundRefX = footXL;
      break;
    case "right":
      groundRefX = footXR;
      break;
    case "both":
    default:
      groundRefX = (footXL + footXR) / 2;
      break;
  }

  return restFootX - groundRefX;
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

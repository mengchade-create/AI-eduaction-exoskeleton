const TWO_PI = Math.PI * 2;

export type WalkGaitKeyframe = {
  phi: number;
  valueDeg: number;
};

export const WALK_KNEE_KEYFRAMES_DEG: WalkGaitKeyframe[] = [
  { phi: 0, valueDeg: 5 },
  { phi: 0.15 * Math.PI, valueDeg: 18 },
  { phi: 0.5 * Math.PI, valueDeg: 5 },
  { phi: 0.85 * Math.PI, valueDeg: 8 },
  { phi: 1 * Math.PI, valueDeg: 40 },
  { phi: 1.3 * Math.PI, valueDeg: 55 },
  { phi: 1.55 * Math.PI, valueDeg: 62 },
  { phi: 1.85 * Math.PI, valueDeg: 18 },
  { phi: 2 * Math.PI, valueDeg: 5 },
];

export const WALK_ANKLE_KEYFRAMES_DEG: WalkGaitKeyframe[] = [
  { phi: 0, valueDeg: 0 },
  { phi: 0.15 * Math.PI, valueDeg: -5 },
  { phi: 0.5 * Math.PI, valueDeg: 5 },
  { phi: 0.85 * Math.PI, valueDeg: 10 },
  { phi: 1 * Math.PI, valueDeg: -15 },
  { phi: 1.3 * Math.PI, valueDeg: -5 },
  { phi: 1.55 * Math.PI, valueDeg: 2 },
  { phi: 1.85 * Math.PI, valueDeg: 0 },
  { phi: 2 * Math.PI, valueDeg: 0 },
];

export function normalizeWalkPhase(phi: number): number {
  return ((phi % TWO_PI) + TWO_PI) % TWO_PI;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

export function sampleWalkGaitCurveDeg(keyframes: WalkGaitKeyframe[], phi: number): number {
  const normalizedPhi = normalizeWalkPhase(phi);

  for (let index = 0; index < keyframes.length - 1; index += 1) {
    const current = keyframes[index];
    const next = keyframes[index + 1];

    if (normalizedPhi >= current.phi && normalizedPhi <= next.phi) {
      const span = next.phi - current.phi;
      const t = span === 0 ? 0 : (normalizedPhi - current.phi) / span;
      return current.valueDeg + (next.valueDeg - current.valueDeg) * smoothstep(t);
    }
  }

  return keyframes[0].valueDeg;
}

export function sampleWalkKneeDeg(phi: number): number {
  return Math.max(0, sampleWalkGaitCurveDeg(WALK_KNEE_KEYFRAMES_DEG, phi));
}

export function sampleWalkAnkleDeg(phi: number): number {
  return sampleWalkGaitCurveDeg(WALK_ANKLE_KEYFRAMES_DEG, phi);
}

export function sampleWalkGaitRad(phi: number): { kneeRad: number; ankleRad: number } {
  const degToRad = Math.PI / 180;

  return {
    kneeRad: sampleWalkKneeDeg(phi) * degToRad,
    ankleRad: sampleWalkAnkleDeg(phi) * degToRad,
  };
}

export function sampleWalkGaitPairRad(leftPhi: number): {
  left: { kneeRad: number; ankleRad: number };
  right: { kneeRad: number; ankleRad: number };
} {
  return {
    left: sampleWalkGaitRad(leftPhi),
    right: sampleWalkGaitRad(leftPhi + Math.PI),
  };
}

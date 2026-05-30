import { describe, expect, it } from "vitest";

import {
  sampleWalkAnkleDeg,
  sampleWalkGaitPairRad,
  sampleWalkGaitRad,
  sampleWalkKneeDeg,
  WALK_ANKLE_KEYFRAMES_DEG,
  WALK_KNEE_KEYFRAMES_DEG,
} from "../walkGait";

const EPSILON = 1e-9;
const TWO_PI = Math.PI * 2;

function sampleCycle(sample: (phi: number) => number, count = 360): number[] {
  return Array.from({ length: count }, (_, index) => sample((index / count) * TWO_PI));
}

function localMaxima(values: number[]): Array<{ index: number; value: number }> {
  const maxima: Array<{ index: number; value: number }> = [];

  for (let index = 1; index < values.length - 1; index += 1) {
    if (values[index] > values[index - 1] && values[index] > values[index + 1]) {
      maxima.push({ index, value: values[index] });
    }
  }

  return maxima;
}

describe("walk gait keyframe curves", () => {
  it("keeps knee and ankle periodic at the cycle boundary", () => {
    expect(sampleWalkKneeDeg(0)).toBeCloseTo(sampleWalkKneeDeg(TWO_PI), 9);
    expect(sampleWalkAnkleDeg(0)).toBeCloseTo(sampleWalkAnkleDeg(TWO_PI), 9);
    expect(WALK_KNEE_KEYFRAMES_DEG[0].valueDeg).toBe(WALK_KNEE_KEYFRAMES_DEG[WALK_KNEE_KEYFRAMES_DEG.length - 1].valueDeg);
    expect(WALK_ANKLE_KEYFRAMES_DEG[0].valueDeg).toBe(WALK_ANKLE_KEYFRAMES_DEG[WALK_ANKLE_KEYFRAMES_DEG.length - 1].valueDeg);
  });

  it("never hyperextends the knee", () => {
    for (const value of sampleCycle(sampleWalkKneeDeg)) {
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });

  it("keeps the knee nearly straight at heel strike", () => {
    expect(sampleWalkKneeDeg(0)).toBeLessThanOrEqual(8);
  });

  it("keeps the knee near straight at mid-stance", () => {
    expect(sampleWalkKneeDeg(0.5 * Math.PI)).toBeLessThanOrEqual(10);
  });

  it("monotonically extends the knee from mid-swing through heel strike", () => {
    const samples = Array.from({ length: 91 }, (_, index) => {
      const t = index / 90;
      return sampleWalkKneeDeg((1.55 + 0.45 * t) * Math.PI);
    });

    for (let index = 1; index < samples.length; index += 1) {
      expect(samples[index]).toBeLessThanOrEqual(samples[index - 1] + EPSILON);
    }
  });

  it("has one smaller stance knee peak and one larger swing knee peak", () => {
    const samples = sampleCycle(sampleWalkKneeDeg);
    const maxima = localMaxima(samples);

    expect(maxima).toHaveLength(2);

    const stanceMax = maxima.find((max) => max.index < samples.length / 2);
    const swingMax = maxima.find((max) => max.index > samples.length / 2);

    expect(stanceMax).toBeDefined();
    expect(swingMax).toBeDefined();
    expect(swingMax?.value).toBeGreaterThan(stanceMax?.value ?? 0);
  });

  it("puts the ankle global plantarflexion minimum in push-off", () => {
    const samples = sampleCycle(sampleWalkAnkleDeg);
    let minIndex = 0;

    for (let index = 1; index < samples.length; index += 1) {
      if (samples[index] < samples[minIndex]) {
        minIndex = index;
      }
    }

    const minPhi = (minIndex / samples.length) * TWO_PI;
    expect(minPhi).toBeGreaterThan(0.85 * Math.PI);
    expect(minPhi).toBeLessThan(1.3 * Math.PI);
  });

  it("keeps ankle dorsiflexed in terminal stance and clear in mid-swing", () => {
    expect(sampleWalkAnkleDeg(0.85 * Math.PI)).toBeGreaterThan(0);
    expect(sampleWalkAnkleDeg(1.55 * Math.PI)).toBeGreaterThanOrEqual(0);
  });

  it("keeps right leg output pi out of phase with left", () => {
    for (const phi of [0, 0.22 * Math.PI, 0.7 * Math.PI, 1.4 * Math.PI]) {
      const pair = sampleWalkGaitPairRad(phi);
      const expectedRight = sampleWalkGaitRad(phi + Math.PI);

      expect(pair.right.kneeRad).toBeCloseTo(expectedRight.kneeRad, 12);
      expect(pair.right.ankleRad).toBeCloseTo(expectedRight.ankleRad, 12);
      expect(pair.left.kneeRad).toBeCloseTo(sampleWalkGaitRad(phi).kneeRad, 12);
      expect(pair.left.ankleRad).toBeCloseTo(sampleWalkGaitRad(phi).ankleRad, 12);
    }
  });
});

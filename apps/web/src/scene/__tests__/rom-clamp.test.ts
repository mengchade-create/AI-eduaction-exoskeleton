import { describe, expect, it } from "vitest";

import { clampHipDeg, isAtRomLimit } from "../Rig";

describe("hip ROM clamp helpers", () => {
  it("clamps hip angles to the SPEC +/-80 degree rendering limit", () => {
    expect(clampHipDeg(0)).toBe(0);
    expect(clampHipDeg(50)).toBe(50);
    expect(clampHipDeg(80)).toBe(80);
    expect(clampHipDeg(85)).toBe(80);
    expect(clampHipDeg(-100)).toBe(-80);
  });

  it("detects ROM boundary values", () => {
    expect(isAtRomLimit(0)).toBe(false);
    expect(isAtRomLimit(79.9)).toBe(false);
    expect(isAtRomLimit(80)).toBe(true);
    expect(isAtRomLimit(-80)).toBe(true);
  });
});

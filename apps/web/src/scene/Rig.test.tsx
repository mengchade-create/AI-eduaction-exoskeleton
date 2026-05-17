import { describe, expect, it } from "vitest";

import Rig, { type RigProps } from "./Rig";

describe("Rig", () => {
  it("can be imported", () => {
    expect(Rig).toBeTypeOf("function");
  });

  it("accepts the expected prop shapes", () => {
    const neutral = {} satisfies RigProps;
    const leftOnly = { leftHipDeg: 30 } satisfies RigProps;
    const stride = { leftHipDeg: 30, rightHipDeg: -30 } satisfies RigProps;

    expect([neutral, leftOnly, stride]).toHaveLength(3);
  });
});

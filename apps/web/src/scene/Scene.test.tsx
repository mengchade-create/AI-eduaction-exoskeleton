import { describe, expect, it } from "vitest";

import Scene from "./Scene";

describe("Scene", () => {
  it("can be imported", () => {
    expect(Scene).toBeTypeOf("function");
  });
});

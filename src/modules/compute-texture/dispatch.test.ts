import { describe, expect, it } from "vitest";

import { calculateDispatchSize } from "@/modules/compute-texture/dispatch";

describe("calculateDispatchSize", () => {
  it("covers exact workgroups", () => {
    expect(calculateDispatchSize(128, 64)).toEqual({ x: 16, y: 8 });
  });

  it("rounds partial workgroups up", () => {
    expect(calculateDispatchSize(129, 65)).toEqual({ x: 17, y: 9 });
  });

  it("rejects invalid dimensions", () => {
    expect(() => calculateDispatchSize(0, 64)).toThrow(RangeError);
    expect(() => calculateDispatchSize(64, 64, 7.5)).toThrow(RangeError);
  });
});

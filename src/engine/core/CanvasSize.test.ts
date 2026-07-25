import { describe, expect, it } from "vitest";

import { calculateCanvasSize } from "./CanvasSize";

describe("calculateCanvasSize", () => {
  it("uses the requested DPR within the configured limit", () => {
    expect(
      calculateCanvasSize({
        cssWidth: 800,
        cssHeight: 600,
        devicePixelRatio: 2,
        maxPixelRatio: 2,
        maxDimension: 8192,
      }),
    ).toEqual({
      width: 1600,
      height: 1200,
      cssWidth: 800,
      cssHeight: 600,
      pixelRatio: 2,
    });
  });

  it("limits DPR for mobile GPU memory protection", () => {
    const size = calculateCanvasSize({
      cssWidth: 390,
      cssHeight: 844,
      devicePixelRatio: 3,
      maxPixelRatio: 1.5,
      maxDimension: 8192,
    });

    expect(size.width).toBe(585);
    expect(size.height).toBe(1266);
    expect(size.pixelRatio).toBe(1.5);
  });

  it("respects the maximum texture dimension", () => {
    const size = calculateCanvasSize({
      cssWidth: 4000,
      cssHeight: 2000,
      devicePixelRatio: 2,
      maxPixelRatio: 2,
      maxDimension: 4096,
    });

    expect(size.width).toBe(4096);
    expect(size.height).toBe(2048);
    expect(size.pixelRatio).toBe(1.024);
  });
});

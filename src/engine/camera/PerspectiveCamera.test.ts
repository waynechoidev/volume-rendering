import { mat4 } from "gl-matrix";
import { describe, expect, it } from "vitest";

import { PerspectiveCamera } from "@/engine/camera/PerspectiveCamera";

describe("PerspectiveCamera", () => {
  it("updates projection when the aspect ratio changes", () => {
    const camera = new PerspectiveCamera();
    const before = camera.projectionMatrix[0];

    camera.setAspect(2);

    expect(camera.projectionMatrix[0]).not.toBe(before);
    expect(camera.projectionMatrix[0]).toBeCloseTo(
      camera.projectionMatrix[5] / 2,
      5,
    );
  });

  it("maintains an inverse view-projection matrix", () => {
    const camera = new PerspectiveCamera();
    const identity = mat4.multiply(
      mat4.create(),
      camera.viewProjectionMatrix,
      camera.inverseViewProjectionMatrix,
    );

    expect(identity[0]).toBeCloseTo(1, 4);
    expect(identity[5]).toBeCloseTo(1, 4);
    expect(identity[10]).toBeCloseTo(1, 4);
    expect(identity[15]).toBeCloseTo(1, 4);
  });

  it("rejects invalid aspect ratios", () => {
    const camera = new PerspectiveCamera();

    expect(() => camera.setAspect(0)).toThrow(RangeError);
  });
});

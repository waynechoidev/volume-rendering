import { describe, expect, it } from "vitest";

import {
  createCubeVertices,
  createGridVertices,
  getVertexCount,
} from "@/engine/geometry/ColoredGeometry";

describe("diagnostics geometry", () => {
  it("creates 12 cube triangles", () => {
    expect(getVertexCount(createCubeVertices())).toBe(36);
  });

  it("creates two line segments per grid coordinate", () => {
    expect(getVertexCount(createGridVertices(10))).toBe(84);
  });
});

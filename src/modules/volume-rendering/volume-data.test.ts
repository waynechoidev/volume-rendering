import { describe, expect, it } from "vitest";

import { createVolumeData } from "@/modules/volume-rendering/volume-data";

describe("createVolumeData", () => {
  it("creates one RGBA texel per voxel", () => {
    expect(
      createVolumeData({ width: 4, height: 3, depth: 2 }),
    ).toHaveLength(4 * 3 * 2 * 4);
  });

  it("places more density near the center than at a corner", () => {
    const data = createVolumeData({ width: 8, height: 8, depth: 8 });
    const corner = data[0] ?? 0;
    const centerOffset = ((4 * 8 + 4) * 8 + 4) * 4;
    expect(data[centerOffset]).toBeGreaterThan(corner);
  });

  it("is deterministic", () => {
    const dimensions = { width: 5, height: 4, depth: 3 };
    expect(createVolumeData(dimensions)).toEqual(createVolumeData(dimensions));
  });
});

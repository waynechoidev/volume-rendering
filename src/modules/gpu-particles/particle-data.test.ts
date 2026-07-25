import { describe, expect, it } from "vitest";

import {
  createInitialParticles,
  PARTICLE_FLOATS,
} from "./particle-data";

describe("createInitialParticles", () => {
  it("creates the requested particle count", () => {
    expect(createInitialParticles(128).length).toBe(128 * PARTICLE_FLOATS);
  });

  it("is deterministic for a given seed", () => {
    expect(createInitialParticles(8, 42)).toEqual(
      createInitialParticles(8, 42),
    );
  });

  it("rejects invalid counts", () => {
    expect(() => createInitialParticles(0)).toThrow(RangeError);
    expect(() => createInitialParticles(1.5)).toThrow(RangeError);
  });
});

export interface VolumeDimensions {
  readonly width: number;
  readonly height: number;
  readonly depth: number;
}

export const DEFAULT_VOLUME_DIMENSIONS: VolumeDimensions = {
  width: 64,
  height: 64,
  depth: 64,
};

/**
 * Builds a deterministic scalar density field. One RGBA texel is used per
 * voxel because rgba8unorm is broadly supported for filtered 3D sampling.
 */
export function createVolumeData({
  width,
  height,
  depth,
}: VolumeDimensions = DEFAULT_VOLUME_DIMENSIONS): Uint8Array<ArrayBuffer> {
  for (const dimension of [width, height, depth]) {
    if (!Number.isInteger(dimension) || dimension <= 0) {
      throw new RangeError("Volume dimensions must be positive integers.");
    }
  }

  const data = new Uint8Array(width * height * depth * 4);

  for (let z = 0; z < depth; z += 1) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const px = ((x + 0.5) / width) * 2 - 1;
        const py = ((y + 0.5) / height) * 2 - 1;
        const pz = ((z + 0.5) / depth) * 2 - 1;
        const shapeX = px + 0.065;
        const shapeY = py - 0.04;

        // A broad base plus progressively smaller elevated puffs produces the
        // cauliflower silhouette of a cumulus cloud. Smooth union removes hard
        // seams while preserving the individual lobes.
        const base = ellipsoid(
          shapeX, shapeY, pz, 0, -0.216, 0, 1.045, 0.272, 0.67,
        );
        const left = ellipsoid(
          shapeX, shapeY, pz, -0.561, -0.128, 0.02, 0.429, 0.224, 0.44,
        );
        const right = ellipsoid(
          shapeX, shapeY, pz, 0.561, -0.104, -0.01, 0.407, 0.24, 0.41,
        );
        const lowerCenter = ellipsoid(
          shapeX, shapeY, pz, -0.022, 0.00, 0.02, 0.781, 0.448, 0.59,
        );
        const upperLeft = ellipsoid(
          shapeX, shapeY, pz, -0.231, 0.136, 0.00, 0.517, 0.248, 0.43,
        );
        const upperRight = ellipsoid(
          shapeX, shapeY, pz, 0.297, 0.176, -0.03, 0.429, 0.272, 0.40,
        );
        const sidePuff = ellipsoid(
          shapeX, shapeY, pz, 0.627, 0.032, 0.03, 0.33, 0.232, 0.35,
        );
        const ridgeLeft = ellipsoid(
          shapeX, shapeY, pz, -0.41, 0.23, 0.01, 0.27, 0.20, 0.34,
        );
        const ridgeCenter = ellipsoid(
          shapeX, shapeY, pz, -0.02, 0.31, 0.00, 0.29, 0.22, 0.35,
        );
        const ridgeRight = ellipsoid(
          shapeX, shapeY, pz, 0.39, 0.24, -0.02, 0.26, 0.20, 0.32,
        );
        let envelope = softUnion(base, lowerCenter);
        envelope = softUnion(envelope, left);
        envelope = softUnion(envelope, right);
        envelope = softUnion(envelope, upperLeft);
        envelope = softUnion(envelope, upperRight);
        envelope = softUnion(envelope, sidePuff);
        envelope = softUnion(envelope, ridgeLeft);
        envelope = softUnion(envelope, ridgeCenter);
        envelope = softUnion(envelope, ridgeRight);

        // Store the smooth analytic density produced by the connected
        // ellipsoid field.
        const flatBase = smoothstep(-0.48, -0.31, shapeY);
        const density = clamp01((envelope - 0.1) * 1.12 * flatBase);
        const offset = ((z * height + y) * width + x) * 4;
        const encodedDensity = Math.round(density * 255);

        data[offset] = encodedDensity;
        data[offset + 1] = encodedDensity;
        data[offset + 2] = encodedDensity;
        data[offset + 3] = 255;
      }
    }
  }

  return data;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function ellipsoid(
  x: number,
  y: number,
  z: number,
  centerX: number,
  centerY: number,
  centerZ: number,
  radiusX: number,
  radiusY: number,
  radiusZ: number,
): number {
  const distance = Math.hypot(
    (x - centerX) / radiusX,
    (y - centerY) / radiusY,
    (z - centerZ) / radiusZ,
  );
  return smoothstep(1, 0.12, distance);
}

function softUnion(a: number, b: number): number {
  // Probabilistic union accumulates overlapping low-density tails instead of
  // discarding them as max(a, b) would, keeping neighboring puffs connected.
  return 1 - (1 - clamp01(a)) * (1 - clamp01(b));
}

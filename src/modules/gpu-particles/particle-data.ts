export const PARTICLE_FLOATS = 8;
export const PARTICLE_STRIDE = PARTICLE_FLOATS * Float32Array.BYTES_PER_ELEMENT;

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

export function createInitialParticles(
  count: number,
  seed = 0x9e37_79b9,
): Float32Array<ArrayBuffer> {
  if (!Number.isInteger(count) || count <= 0) {
    throw new RangeError("Particle count must be a positive integer.");
  }

  const random = createRandom(seed);
  const data = new Float32Array(count * PARTICLE_FLOATS);

  for (let index = 0; index < count; index += 1) {
    const offset = index * PARTICLE_FLOATS;
    const seedValue = random();
    const innerRadius = 0.68;
    const outerRadius = 7.2;
    const radius = Math.sqrt(
      innerRadius * innerRadius +
        random() *
          (outerRadius * outerRadius - innerRadius * innerRadius),
    );
    const angle = random() * Math.PI * 2;
    const height =
      (random() - 0.5) * (0.08 + Math.pow(radius / outerRadius, 1.5) * 0.7);
    const orbitalSpeed = Math.sqrt(
      (8.5 * radius) / (radius * radius + 0.18),
    );
    const inwardDrift = 0.015 + random() * 0.018;

    data[offset] = Math.cos(angle) * radius;
    data[offset + 1] = height;
    data[offset + 2] = Math.sin(angle) * radius;
    data[offset + 3] = 1;
    data[offset + 4] =
      -Math.sin(angle) * orbitalSpeed - Math.cos(angle) * inwardDrift;
    data[offset + 5] = (random() - 0.5) * 0.08;
    data[offset + 6] =
      Math.cos(angle) * orbitalSpeed - Math.sin(angle) * inwardDrift;
    data[offset + 7] = seedValue;
  }

  return data;
}

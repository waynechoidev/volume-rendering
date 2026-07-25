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
    const radius = Math.cbrt(random()) * 2.4;
    const azimuth = random() * Math.PI * 2;
    const vertical = random() * 2 - 1;
    const horizontal = Math.sqrt(1 - vertical * vertical);

    data[offset] = Math.cos(azimuth) * horizontal * radius;
    data[offset + 1] = vertical * radius + 2.8;
    data[offset + 2] = Math.sin(azimuth) * horizontal * radius;
    data[offset + 3] = 1;
    data[offset + 4] = (random() - 0.5) * 0.45;
    data[offset + 5] = (random() - 0.25) * 0.35;
    data[offset + 6] = (random() - 0.5) * 0.45;
    data[offset + 7] = random();
  }

  return data;
}

export const DENSITY_VOLUME_SIZE = 48;

export function createDensityVolume(): Uint8Array<ArrayBuffer> {
  const size = DENSITY_VOLUME_SIZE;
  const data = new Uint8Array(size * size * size);

  for (let z = 0; z < size; z += 1) {
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const px = ((x + 0.5) / size) * 2 - 1;
        const py = ((y + 0.5) / size) * 2 - 1;
        const pz = ((z + 0.5) / size) * 2 - 1;
        const distance = Math.hypot(px / 0.82, py / 0.55, pz / 0.7);
        const density = 1 - smoothstep(0.25, 1, distance);
        data[(z * size + y) * size + x] = Math.round(density * 255);
      }
    }
  }

  return data;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

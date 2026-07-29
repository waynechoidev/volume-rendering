const VERTEX_COMPONENTS = 6;

function pushVertex(
  vertices: number[],
  position: readonly [number, number, number],
  color: readonly [number, number, number],
): void {
  vertices.push(...position, ...color);
}

export function createCubeVertices(): Float32Array<ArrayBuffer> {
  const vertices: number[] = [];
  const faces: readonly [
    readonly [number, number, number],
    readonly [
      readonly [number, number, number],
      readonly [number, number, number],
      readonly [number, number, number],
      readonly [number, number, number],
    ],
  ][] = [
    [[0.28, 0.83, 1], [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]],
    [[0.42, 0.3, 1], [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]]],
    [[1, 0.3, 0.56], [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]]],
    [[0.3, 1, 0.65], [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]]],
    [[1, 0.74, 0.3], [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]]],
    [[0.24, 0.33, 0.55], [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]]],
  ];

  for (const [color, corners] of faces) {
    const [a, b, c, d] = corners;
    pushVertex(vertices, a, color);
    pushVertex(vertices, b, color);
    pushVertex(vertices, c, color);
    pushVertex(vertices, a, color);
    pushVertex(vertices, c, color);
    pushVertex(vertices, d, color);
  }

  return new Float32Array(vertices);
}

export function createGridVertices(
  halfExtent = 10,
): Float32Array<ArrayBuffer> {
  const vertices: number[] = [];
  const minor: readonly [number, number, number] = [0.13, 0.17, 0.25];
  const xAxis: readonly [number, number, number] = [0.72, 0.2, 0.32];
  const zAxis: readonly [number, number, number] = [0.2, 0.54, 0.84];

  for (let coordinate = -halfExtent; coordinate <= halfExtent; coordinate += 1) {
    const xColor = coordinate === 0 ? zAxis : minor;
    const zColor = coordinate === 0 ? xAxis : minor;
    pushVertex(vertices, [-halfExtent, 0, coordinate], xColor);
    pushVertex(vertices, [halfExtent, 0, coordinate], xColor);
    pushVertex(vertices, [coordinate, 0, -halfExtent], zColor);
    pushVertex(vertices, [coordinate, 0, halfExtent], zColor);
  }

  return new Float32Array(vertices);
}

export function getVertexCount(vertices: Float32Array<ArrayBufferLike>): number {
  return vertices.length / VERTEX_COMPONENTS;
}

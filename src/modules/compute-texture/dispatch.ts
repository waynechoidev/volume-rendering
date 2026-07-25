export interface DispatchSize {
  readonly x: number;
  readonly y: number;
}

export function calculateDispatchSize(
  width: number,
  height: number,
  workgroupWidth = 8,
  workgroupHeight = 8,
): DispatchSize {
  for (const [label, value] of [
    ["width", width],
    ["height", height],
    ["workgroupWidth", workgroupWidth],
    ["workgroupHeight", workgroupHeight],
  ] as const) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new RangeError(`${label} must be a positive integer.`);
    }
  }

  return {
    x: Math.ceil(width / workgroupWidth),
    y: Math.ceil(height / workgroupHeight),
  };
}

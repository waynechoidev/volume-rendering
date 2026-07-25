export interface GPUTimingSupport {
  readonly supported: boolean;
  readonly timestampPeriod: number;
}

export function getGPUTimingSupport(adapter: GPUAdapter): GPUTimingSupport {
  return {
    supported: adapter.features.has("timestamp-query"),
    timestampPeriod: 1,
  };
}

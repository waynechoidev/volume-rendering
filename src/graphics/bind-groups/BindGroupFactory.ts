export function createBindGroup(
  device: GPUDevice,
  label: string,
  layout: GPUBindGroupLayout,
  entries: readonly GPUBindGroupEntry[],
): GPUBindGroup {
  return device.createBindGroup({
    label,
    layout,
    entries,
  });
}

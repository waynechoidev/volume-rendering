export async function createRenderPipeline(
  device: GPUDevice,
  descriptor: GPURenderPipelineDescriptor,
): Promise<GPURenderPipeline> {
  return device.createRenderPipelineAsync(descriptor);
}

export async function createComputePipeline(
  device: GPUDevice,
  descriptor: GPUComputePipelineDescriptor,
): Promise<GPUComputePipeline> {
  return device.createComputePipelineAsync(descriptor);
}

export async function assertShaderCompiles(
  shaderModule: GPUShaderModule,
  label: string,
): Promise<void> {
  const compilationInfo = await shaderModule.getCompilationInfo();
  const errors = compilationInfo.messages.filter(({ type }) => type === "error");

  if (errors.length === 0) {
    return;
  }

  const details = errors
    .map(
      ({ lineNum, linePos, message }) =>
        `line ${lineNum}:${linePos} ${message}`,
    )
    .join("\n");
  throw new Error(`${label} compilation failed:\n${details}`);
}

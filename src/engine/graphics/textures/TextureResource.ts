export class TextureResource {
  public readonly texture: GPUTexture;
  public readonly view: GPUTextureView;

  public constructor(
    device: GPUDevice,
    descriptor: GPUTextureDescriptor,
    viewDescriptor?: GPUTextureViewDescriptor,
  ) {
    this.texture = device.createTexture(descriptor);
    this.view = this.texture.createView(viewDescriptor);
  }

  public destroy(): void {
    this.texture.destroy();
  }
}

export function createDepthTexture(
  device: GPUDevice,
  width: number,
  height: number,
  format: GPUTextureFormat = "depth24plus",
): TextureResource {
  return new TextureResource(device, {
    label: "Engine depth texture",
    size: { width, height },
    format,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });
}

export function createSampler(
  device: GPUDevice,
  descriptor: GPUSamplerDescriptor = {},
): GPUSampler {
  return device.createSampler(descriptor);
}

import { GPUBufferResource } from "./GPUBufferResource";

export class UniformBuffer extends GPUBufferResource {
  public constructor(
    device: GPUDevice,
    label: string,
    size: number,
    initialData?: ArrayBufferView<ArrayBuffer>,
  ) {
    super(device, {
      label,
      size,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      initialData,
    });
  }
}

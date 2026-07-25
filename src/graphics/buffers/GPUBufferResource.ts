export interface GPUBufferResourceOptions {
  readonly label: string;
  readonly size: number;
  readonly usage: GPUBufferUsageFlags;
  readonly initialData?: ArrayBufferView<ArrayBuffer>;
}

export class GPUBufferResource {
  public readonly buffer: GPUBuffer;
  public readonly size: number;

  public constructor(
    private readonly device: GPUDevice,
    { label, size, usage, initialData }: GPUBufferResourceOptions,
  ) {
    this.size = Math.ceil(size / 4) * 4;
    this.buffer = device.createBuffer({
      label,
      size: this.size,
      usage,
      mappedAtCreation: initialData !== undefined,
    });

    if (initialData) {
      const mappedRange = this.buffer.getMappedRange();
      new Uint8Array(mappedRange).set(
        new Uint8Array(
          initialData.buffer,
          initialData.byteOffset,
          initialData.byteLength,
        ),
      );
      this.buffer.unmap();
    }
  }

  public write(
    data: ArrayBufferView<ArrayBuffer>,
    bufferOffset = 0,
  ): void {
    if (bufferOffset + data.byteLength > this.size) {
      throw new RangeError("GPU buffer write exceeds the allocated size.");
    }

    this.device.queue.writeBuffer(this.buffer, bufferOffset, data);
  }

  public destroy(): void {
    this.buffer.destroy();
  }
}

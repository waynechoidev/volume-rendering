import { UniformBuffer } from "@/engine/graphics/buffers/UniformBuffer";
import { Module } from "@/engine/modules/Module";
import fragmentSource from "./volume.fragment.wgsl?raw";

const PARAMETER_BYTES = 16;

export class VolumeRenderingModule extends Module {
  public readonly name = "Volume Rendering";

  public density = 0.42;
  public absorption = 1.2;
  public volumeSize = 2;

  private pipeline!: GPURenderPipeline;
  private bindGroup!: GPUBindGroup;
  private parameterBuffer!: UniformBuffer;
  private readonly parameterData = new Float32Array(PARAMETER_BYTES / 4);

  public async setup(): Promise<void> {
    const vertex = await this.fullscreenVertexShader();
    const fragment = await this.compileShader(fragmentSource, "fragment");
    this.parameterBuffer = new UniformBuffer(
      this.device,
      "Homogeneous medium parameters",
      PARAMETER_BYTES,
    );
    const layout = this.device.createBindGroupLayout({
      label: "Homogeneous medium bind group layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
      ],
    });

    this.pipeline = await this.device.createRenderPipelineAsync({
      label: "Homogeneous medium pipeline",
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [layout] }),
      vertex: { module: vertex, entryPoint: "main" },
      fragment: {
        module: fragment,
        entryPoint: "main",
        targets: [{ format: this.presentationFormat }],
      },
    });
    this.bindGroup = this.device.createBindGroup({
      label: "Homogeneous medium bind group",
      layout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.cameraUniforms.resource.buffer },
        },
        { binding: 1, resource: { buffer: this.parameterBuffer.buffer } },
      ],
    });

    const folder = this.parameters.register(this.name);
    folder.add(this, "density", 0, 1.5, 0.01).name("Density");
    folder.add(this, "absorption", 0, 4, 0.05).name("Absorption");
    folder.add(this, "volumeSize", 1, 5, 0.05).name("Volume size");
  }

  public frame(): void {
    this.parameterData[0] = this.density;
    this.parameterData[1] = this.absorption;
    this.parameterData[2] = this.volumeSize;
    this.parameterBuffer.write(this.parameterData);

    const pass = this.commandEncoder.beginRenderPass({
      label: "Homogeneous medium pass",
      colorAttachments: [{
        view: this.colorView,
        clearValue: { r: 0.01, g: 0.02, b: 0.04, a: 1 },
        loadOp: "clear",
        storeOp: "store",
      }],
    });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(3);
    pass.end();
  }

  public teardown(): void {
    this.parameterBuffer?.destroy();
  }
}

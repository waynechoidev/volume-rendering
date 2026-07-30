import { UniformBuffer } from "@/engine/graphics/buffers/UniformBuffer";
import { Module } from "@/engine/modules/Module";
import fragmentSource from "./volume.fragment.wgsl?raw";

const PARAMETER_BYTES = 16;

export class VolumeRenderingModule extends Module {
  public readonly name = "Volume Rendering";

  public stepCount = 96;
  public densityScale = 1.1;
  public absorption = 1.5;
  public volumeSize = 3.2;

  private pipeline!: GPURenderPipeline;
  private bindGroup!: GPUBindGroup;
  private parameterBuffer!: UniformBuffer;
  private readonly parameterStorage = new ArrayBuffer(PARAMETER_BYTES);
  private readonly parameterUint32 = new Uint32Array(this.parameterStorage);
  private readonly parameterFloats = new Float32Array(this.parameterStorage);

  public async setup(): Promise<void> {
    const vertex = await this.fullscreenVertexShader();
    const fragment = await this.compileShader(fragmentSource, "fragment");
    this.parameterBuffer = new UniformBuffer(
      this.device,
      "Discrete volume parameters",
      PARAMETER_BYTES,
    );
    const layout = this.device.createBindGroupLayout({
      label: "Discrete volume bind group layout",
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
      label: "Discrete volume pipeline",
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [layout] }),
      vertex: { module: vertex, entryPoint: "main" },
      fragment: {
        module: fragment,
        entryPoint: "main",
        targets: [{ format: this.presentationFormat }],
      },
    });
    this.bindGroup = this.device.createBindGroup({
      label: "Discrete volume bind group",
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
    folder.add(this, "stepCount", 16, 256, 1).name("Ray-march steps");
    folder.add(this, "densityScale", 0, 3, 0.05).name("Density");
    folder.add(this, "absorption", 0, 5, 0.05).name("Absorption");
    folder.add(this, "volumeSize", 1, 5, 0.05).name("Volume size");
    if (window.matchMedia("(max-width: 700px)").matches) {
      this.stepCount = 64;
      folder.close();
    }
  }

  public frame(): void {
    this.parameterUint32[0] = Math.round(this.stepCount);
    this.parameterFloats[1] = this.densityScale;
    this.parameterFloats[2] = this.absorption;
    this.parameterFloats[3] = this.volumeSize;
    this.parameterBuffer.write(this.parameterFloats);

    const pass = this.commandEncoder.beginRenderPass({
      label: "Discrete volume pass",
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

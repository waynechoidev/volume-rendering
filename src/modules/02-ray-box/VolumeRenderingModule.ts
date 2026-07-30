import { Module } from "@/engine/modules/Module";
import fragmentSource from "./volume.fragment.wgsl?raw";

export class VolumeRenderingModule extends Module {
  public readonly name = "Volume Rendering";

  private pipeline!: GPURenderPipeline;
  private bindGroup!: GPUBindGroup;

  public async setup(): Promise<void> {
    const vertex = await this.fullscreenVertexShader();
    const fragment = await this.compileShader(fragmentSource, "fragment");
    const cameraLayout = this.device.createBindGroupLayout({
      label: "Ray box bind group layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
      ],
    });

    this.pipeline = await this.device.createRenderPipelineAsync({
      label: "Ray box pipeline",
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [cameraLayout],
      }),
      vertex: { module: vertex, entryPoint: "main" },
      fragment: {
        module: fragment,
        entryPoint: "main",
        targets: [{ format: this.presentationFormat }],
      },
    });
    this.bindGroup = this.device.createBindGroup({
      label: "Ray box bind group",
      layout: cameraLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.cameraUniforms.resource.buffer },
        },
      ],
    });
  }

  public frame(): void {
    const pass = this.commandEncoder.beginRenderPass({
      label: "Ray box pass",
      colorAttachments: [
        {
          view: this.colorView,
          clearValue: { r: 0.01, g: 0.02, b: 0.04, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(3);
    pass.end();
  }
}

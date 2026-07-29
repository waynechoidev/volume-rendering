import { Module } from "@/engine/modules/Module";
import fullscreenVertexSource from "@/engine/shaders/fullscreen.vertex.wgsl?raw";
import { TextureResource } from "@/engine/graphics/textures/TextureResource";
import computeShaderSource from "@/modules/compute-circle/compute-circle.compute.wgsl?raw";
import fragmentShaderSource from "@/modules/compute-circle/compute-circle.fragment.wgsl?raw";

const WORKGROUP_SIZE = 8;
const OUTPUT_FORMAT: GPUTextureFormat = "rgba8unorm";

export class ComputeCircleModule extends Module {
  public readonly name = "Compute Circle";

  private output: TextureResource | undefined;
  private computePipeline!: GPUComputePipeline;
  private renderPipeline!: GPURenderPipeline;
  private computeBindGroup!: GPUBindGroup;
  private renderBindGroup!: GPUBindGroup;

  public async setup(): Promise<void> {
    const compute = await this.compileShader(computeShaderSource, "compute");
    const vertex = await this.compileShader(fullscreenVertexSource, "vertex");
    const fragment = await this.compileShader(fragmentShaderSource, "fragment");

    this.computePipeline = await this.device.createComputePipelineAsync({
      label: "Compute circle compute pipeline",
      layout: "auto",
      compute: { module: compute, entryPoint: "main" },
    });
    this.renderPipeline = await this.device.createRenderPipelineAsync({
      label: "Compute circle render pipeline",
      layout: "auto",
      vertex: { module: vertex, entryPoint: "main" },
      fragment: {
        module: fragment,
        entryPoint: "main",
        targets: [{ format: this.gpu.presentationFormat }],
      },
      primitive: { topology: "triangle-list" },
    });
  }

  public resizeResources(): void {
    const output = new TextureResource(this.device, {
      label: "Compute circle output",
      size: this.size,
      format: OUTPUT_FORMAT,
      usage:
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.TEXTURE_BINDING,
    });
    this.computeBindGroup = this.device.createBindGroup({
      label: "Compute circle compute bind group",
      layout: this.computePipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: output.view }],
    });
    this.renderBindGroup = this.device.createBindGroup({
      label: "Compute circle render bind group",
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: output.view }],
    });
    this.output?.destroy();
    this.output = output;
  }

  public frame(): void {
    const compute = this.commandEncoder.beginComputePass({
      label: "Compute circle compute pass",
    });
    compute.setPipeline(this.computePipeline);
    compute.setBindGroup(0, this.computeBindGroup);
    compute.dispatchWorkgroups(
      Math.ceil(this.size.width / WORKGROUP_SIZE),
      Math.ceil(this.size.height / WORKGROUP_SIZE),
    );
    compute.end();

    const render = this.commandEncoder.beginRenderPass({
      label: "Compute circle screen pass",
      colorAttachments: [{
        view: this.colorView,
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: "clear",
        storeOp: "store",
      }],
    });
    render.setPipeline(this.renderPipeline);
    render.setBindGroup(0, this.renderBindGroup);
    render.draw(3);
    render.end();
  }

  public teardown(): void {
    this.output?.destroy();
  }
}

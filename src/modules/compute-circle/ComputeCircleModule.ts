import type { CanvasSize } from "@/engine/core/CanvasSize";
import type {
  EngineContext,
  EngineModule,
  ModuleRenderContext,
} from "@/engine/core/EngineModule";
import {
  assertShaderCompiles,
  createComputePipeline,
  createRenderPipeline,
} from "@/engine/graphics/pipelines/PipelineFactory";
import { TextureResource } from "@/engine/graphics/textures/TextureResource";
import computeShaderSource from "@/modules/compute-circle/compute-circle.compute.wgsl?raw";
import fragmentShaderSource from "@/modules/compute-circle/compute-circle.fragment.wgsl?raw";
import vertexShaderSource from "@/modules/compute-circle/compute-circle.vertex.wgsl?raw";

const WORKGROUP_SIZE = 8;
const OUTPUT_FORMAT: GPUTextureFormat = "rgba8unorm";

export class ComputeCircleModule implements EngineModule {
  public readonly name = "Compute Circle";

  private device: GPUDevice | undefined;
  private computePipeline: GPUComputePipeline | undefined;
  private renderPipeline: GPURenderPipeline | undefined;
  private output: TextureResource | undefined;
  private computeBindGroup: GPUBindGroup | undefined;
  private renderBindGroup: GPUBindGroup | undefined;
  private size: CanvasSize | undefined;

  public async initialize({ gpu }: EngineContext): Promise<void> {
    this.device = gpu.device;
    const compute = gpu.device.createShaderModule({
      label: "Compute circle compute shader",
      code: computeShaderSource,
    });
    const vertex = gpu.device.createShaderModule({
      label: "Compute circle vertex shader",
      code: vertexShaderSource,
    });
    const fragment = gpu.device.createShaderModule({
      label: "Compute circle fragment shader",
      code: fragmentShaderSource,
    });
    await assertShaderCompiles(compute, "Compute circle compute shader");
    await assertShaderCompiles(vertex, "Compute circle vertex shader");
    await assertShaderCompiles(fragment, "Compute circle fragment shader");
    this.computePipeline = await createComputePipeline(gpu.device, {
      label: "Compute circle compute pipeline",
      layout: "auto",
      compute: { module: compute, entryPoint: "main" },
    });
    this.renderPipeline = await createRenderPipeline(gpu.device, {
      label: "Compute circle render pipeline",
      layout: "auto",
      vertex: { module: vertex, entryPoint: "main" },
      fragment: {
        module: fragment,
        entryPoint: "main",
        targets: [{ format: gpu.presentationFormat }],
      },
      primitive: { topology: "triangle-list" },
    });
  }

  public resize(size: CanvasSize): void {
    if (
      this.size?.width === size.width &&
      this.size.height === size.height
    ) {
      this.size = size;
      return;
    }
    if (!this.device || !this.computePipeline || !this.renderPipeline) {
      return;
    }

    this.size = size;
    const nextOutput = new TextureResource(this.device, {
      label: "Compute circle output",
      size: { width: size.width, height: size.height },
      format: OUTPUT_FORMAT,
      usage:
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.TEXTURE_BINDING,
    });
    const nextComputeBindGroup = this.device.createBindGroup({
      label: "Compute circle compute bind group",
      layout: this.computePipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: nextOutput.view }],
    });
    const nextRenderBindGroup = this.device.createBindGroup({
      label: "Compute circle render bind group",
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: nextOutput.view }],
    });

    this.output?.destroy();
    this.output = nextOutput;
    this.computeBindGroup = nextComputeBindGroup;
    this.renderBindGroup = nextRenderBindGroup;
  }

  public render({
    commandEncoder,
    colorView,
  }: ModuleRenderContext): void {
    if (
      !this.size ||
      !this.computePipeline ||
      !this.renderPipeline ||
      !this.computeBindGroup ||
      !this.renderBindGroup
    ) {
      throw new Error("Compute Circle rendered before resize.");
    }

    const computePass = commandEncoder.beginComputePass({
      label: "Compute circle compute pass",
    });
    computePass.setPipeline(this.computePipeline);
    computePass.setBindGroup(0, this.computeBindGroup);
    computePass.dispatchWorkgroups(
      Math.ceil(this.size.width / WORKGROUP_SIZE),
      Math.ceil(this.size.height / WORKGROUP_SIZE),
    );
    computePass.end();

    const renderPass = commandEncoder.beginRenderPass({
      label: "Compute circle screen pass",
      colorAttachments: [
        {
          view: colorView,
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    renderPass.setPipeline(this.renderPipeline);
    renderPass.setBindGroup(0, this.renderBindGroup);
    renderPass.draw(3);
    renderPass.end();
  }

  public destroy(): void {
    this.output?.destroy();
    this.output = undefined;
    this.computeBindGroup = undefined;
    this.renderBindGroup = undefined;
    this.computePipeline = undefined;
    this.renderPipeline = undefined;
    this.device = undefined;
    this.size = undefined;
  }
}

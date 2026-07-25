import type { CanvasSize } from "@/engine/core/CanvasSize";
import type {
  EngineContext,
  EngineModule,
  ModuleRenderContext,
} from "@/engine/core/EngineModule";
import type { FrameInfo } from "@/engine/core/FrameLoop";
import { UniformBuffer } from "@/engine/graphics/buffers/UniformBuffer";
import {
  assertShaderCompiles,
  createComputePipeline,
  createRenderPipeline,
} from "@/engine/graphics/pipelines/PipelineFactory";
import { TextureResource } from "@/engine/graphics/textures/TextureResource";
import computeShaderSource from "@/modules/compute-texture/compute-texture.compute.wgsl?raw";
import renderShaderSource from "@/modules/compute-texture/compute-texture.render.wgsl?raw";
import { calculateDispatchSize, type DispatchSize } from "@/modules/compute-texture/dispatch";

const OUTPUT_FORMAT: GPUTextureFormat = "rgba8unorm";
const PARAMETER_BYTES = 32;

export class ComputeTextureModule implements EngineModule {
  public readonly name = "Compute Texture";

  public scale = 2.2;
  public speed = 0.65;
  public contrast = 0.72;

  private device: GPUDevice | undefined;
  private parameters: EngineContext["parameters"] | undefined;
  private parameterBuffer: UniformBuffer | undefined;
  private computePipeline: GPUComputePipeline | undefined;
  private renderPipeline: GPURenderPipeline | undefined;
  private computeLayout: GPUBindGroupLayout | undefined;
  private renderLayout: GPUBindGroupLayout | undefined;
  private outputTexture: TextureResource | undefined;
  private computeBindGroup: GPUBindGroup | undefined;
  private renderBindGroup: GPUBindGroup | undefined;
  private dispatchSize: DispatchSize | undefined;
  private size: CanvasSize | undefined;
  private latestFrame: FrameInfo | undefined;
  private readonly parameterStorage = new ArrayBuffer(PARAMETER_BYTES);
  private readonly parameterFloats = new Float32Array(this.parameterStorage);
  private readonly parameterIntegers = new Uint32Array(this.parameterStorage);

  public async initialize(context: EngineContext): Promise<void> {
    this.device = context.gpu.device;
    this.parameters = context.parameters;
    this.parameterBuffer = new UniformBuffer(
      this.device,
      "Compute texture parameters",
      PARAMETER_BYTES,
    );

    const computeShader = this.device.createShaderModule({
      label: "Compute texture compute shader",
      code: computeShaderSource,
    });
    const renderShader = this.device.createShaderModule({
      label: "Compute texture render shader",
      code: renderShaderSource,
    });
    await Promise.all([
      assertShaderCompiles(computeShader, "Compute texture compute shader"),
      assertShaderCompiles(renderShader, "Compute texture render shader"),
    ]);

    this.computeLayout = this.device.createBindGroupLayout({
      label: "Compute texture compute layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          storageTexture: {
            access: "write-only",
            format: OUTPUT_FORMAT,
            viewDimension: "2d",
          },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" },
        },
      ],
    });
    this.renderLayout = this.device.createBindGroupLayout({
      label: "Compute texture render layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: "float", viewDimension: "2d" },
        },
      ],
    });
    this.computePipeline = await createComputePipeline(this.device, {
      label: "Compute texture compute pipeline",
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [this.computeLayout],
      }),
      compute: { module: computeShader, entryPoint: "compute_main" },
    });
    this.renderPipeline = await createRenderPipeline(this.device, {
      label: "Compute texture render pipeline",
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [this.renderLayout],
      }),
      vertex: { module: renderShader, entryPoint: "vertex_main" },
      fragment: {
        module: renderShader,
        entryPoint: "fragment_main",
        targets: [{ format: context.gpu.presentationFormat }],
      },
      primitive: { topology: "triangle-list" },
    });

    const folder = context.parameters.register(this.name);
    folder.add(this, "scale", 0.5, 6, 0.05).name("Pattern scale");
    folder.add(this, "speed", 0, 2, 0.05).name("Animation speed");
    folder.add(this, "contrast", 0.1, 1.5, 0.05).name("Contrast");
    if (window.matchMedia("(max-width: 700px)").matches) {
      folder.close();
    }
  }

  public update(frame: FrameInfo): void {
    this.latestFrame = frame;
    if (!this.size || !this.parameterBuffer) {
      return;
    }

    this.parameterIntegers[0] = this.size.width;
    this.parameterIntegers[1] = this.size.height;
    this.parameterFloats[2] = frame.time;
    this.parameterFloats[3] = this.scale;
    this.parameterFloats[4] = this.speed;
    this.parameterFloats[5] = this.contrast;
    this.parameterBuffer.write(this.parameterFloats);
  }

  public render(context: ModuleRenderContext): void {
    if (
      !this.latestFrame ||
      !this.computePipeline ||
      !this.renderPipeline ||
      !this.computeBindGroup ||
      !this.renderBindGroup ||
      !this.dispatchSize
    ) {
      throw new Error("Compute Texture rendered before initialization.");
    }

    const computePass = context.commandEncoder.beginComputePass({
      label: "Compute texture pass",
    });
    computePass.setPipeline(this.computePipeline);
    computePass.setBindGroup(0, this.computeBindGroup);
    computePass.dispatchWorkgroups(this.dispatchSize.x, this.dispatchSize.y);
    computePass.end();

    const renderPass = context.commandEncoder.beginRenderPass({
      label: "Compute texture fullscreen pass",
      colorAttachments: [
        {
          view: context.colorView,
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

  public resize(size: CanvasSize): void {
    if (
      this.size?.width === size.width &&
      this.size.height === size.height
    ) {
      this.size = size;
      return;
    }

    this.size = size;
    this.recreateOutputTexture();
  }

  public destroy(): void {
    this.parameters?.remove(this.name);
    this.outputTexture?.destroy();
    this.parameterBuffer?.destroy();
    this.outputTexture = undefined;
    this.parameterBuffer = undefined;
    this.computeBindGroup = undefined;
    this.renderBindGroup = undefined;
    this.computePipeline = undefined;
    this.renderPipeline = undefined;
    this.computeLayout = undefined;
    this.renderLayout = undefined;
    this.dispatchSize = undefined;
    this.latestFrame = undefined;
    this.size = undefined;
    this.parameters = undefined;
    this.device = undefined;
  }

  private recreateOutputTexture(): void {
    if (
      !this.device ||
      !this.parameterBuffer ||
      !this.computeLayout ||
      !this.renderLayout ||
      !this.size
    ) {
      return;
    }

    const nextTexture = new TextureResource(this.device, {
      label: "Compute texture output",
      size: { width: this.size.width, height: this.size.height },
      format: OUTPUT_FORMAT,
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    });
    const nextComputeBindGroup = this.device.createBindGroup({
      label: "Compute texture compute bind group",
      layout: this.computeLayout,
      entries: [
        { binding: 0, resource: nextTexture.view },
        { binding: 1, resource: { buffer: this.parameterBuffer.buffer } },
      ],
    });
    const nextRenderBindGroup = this.device.createBindGroup({
      label: "Compute texture render bind group",
      layout: this.renderLayout,
      entries: [{ binding: 0, resource: nextTexture.view }],
    });

    this.outputTexture?.destroy();
    this.outputTexture = nextTexture;
    this.computeBindGroup = nextComputeBindGroup;
    this.renderBindGroup = nextRenderBindGroup;
    this.dispatchSize = calculateDispatchSize(
      this.size.width,
      this.size.height,
    );
  }
}

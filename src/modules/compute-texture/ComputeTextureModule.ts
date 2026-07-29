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
import fragmentShaderSource from "@/modules/compute-texture/compute-texture.fragment.wgsl?raw";
import vertexShaderSource from "@/modules/compute-texture/compute-texture.vertex.wgsl?raw";
import {
  calculateDispatchSize,
  type DispatchSize,
} from "@/modules/compute-texture/dispatch";

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
  private outputTexture: TextureResource | undefined;
  private computeBindGroup: GPUBindGroup | undefined;
  private renderBindGroup: GPUBindGroup | undefined;
  private dispatchSize: DispatchSize | undefined;
  private size: CanvasSize | undefined;
  private readonly parameterStorage = new ArrayBuffer(PARAMETER_BYTES);
  private readonly parameterFloats = new Float32Array(this.parameterStorage);
  private readonly parameterIntegers = new Uint32Array(this.parameterStorage);

  public async initialize(context: EngineContext): Promise<void> {
    const { gpu } = context;
    this.device = gpu.device;
    this.parameters = context.parameters;
    this.parameterBuffer = new UniformBuffer(
      gpu.device,
      "Compute texture parameters",
      PARAMETER_BYTES,
    );

    const compute = gpu.device.createShaderModule({
      label: "Compute texture compute shader",
      code: computeShaderSource,
    });
    const vertex = gpu.device.createShaderModule({
      label: "Compute texture vertex shader",
      code: vertexShaderSource,
    });
    const fragment = gpu.device.createShaderModule({
      label: "Compute texture fragment shader",
      code: fragmentShaderSource,
    });
    await assertShaderCompiles(compute, "Compute texture compute shader");
    await assertShaderCompiles(vertex, "Compute texture vertex shader");
    await assertShaderCompiles(fragment, "Compute texture fragment shader");
    this.computePipeline = await createComputePipeline(gpu.device, {
      label: "Compute texture compute pipeline",
      layout: "auto",
      compute: { module: compute, entryPoint: "main" },
    });
    this.renderPipeline = await createRenderPipeline(gpu.device, {
      label: "Compute texture render pipeline",
      layout: "auto",
      vertex: { module: vertex, entryPoint: "main" },
      fragment: {
        module: fragment,
        entryPoint: "main",
        targets: [{ format: gpu.presentationFormat }],
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

  public render({
    commandEncoder,
    colorView,
  }: ModuleRenderContext): void {
    if (
      !this.computePipeline ||
      !this.renderPipeline ||
      !this.computeBindGroup ||
      !this.renderBindGroup ||
      !this.dispatchSize
    ) {
      throw new Error("Compute Texture rendered before initialization.");
    }

    const computePass = commandEncoder.beginComputePass({
      label: "Compute texture pass",
    });
    computePass.setPipeline(this.computePipeline);
    computePass.setBindGroup(0, this.computeBindGroup);
    computePass.dispatchWorkgroups(this.dispatchSize.x, this.dispatchSize.y);
    computePass.end();

    const renderPass = commandEncoder.beginRenderPass({
      label: "Compute texture fullscreen pass",
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
    this.parameters?.remove(this.name);
    this.outputTexture?.destroy();
    this.parameterBuffer?.destroy();
    this.outputTexture = undefined;
    this.parameterBuffer = undefined;
    this.computeBindGroup = undefined;
    this.renderBindGroup = undefined;
    this.computePipeline = undefined;
    this.renderPipeline = undefined;
    this.dispatchSize = undefined;
    this.size = undefined;
    this.parameters = undefined;
    this.device = undefined;
  }

  private recreateOutputTexture(): void {
    if (
      !this.device ||
      !this.parameterBuffer ||
      !this.computePipeline ||
      !this.renderPipeline ||
      !this.size
    ) {
      return;
    }

    const nextTexture = new TextureResource(this.device, {
      label: "Compute texture output",
      size: { width: this.size.width, height: this.size.height },
      format: OUTPUT_FORMAT,
      usage:
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.TEXTURE_BINDING,
    });
    const nextComputeBindGroup = this.device.createBindGroup({
      label: "Compute texture compute bind group",
      layout: this.computePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: nextTexture.view },
        {
          binding: 1,
          resource: { buffer: this.parameterBuffer.buffer },
        },
      ],
    });
    const nextRenderBindGroup = this.device.createBindGroup({
      label: "Compute texture render bind group",
      layout: this.renderPipeline.getBindGroupLayout(0),
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

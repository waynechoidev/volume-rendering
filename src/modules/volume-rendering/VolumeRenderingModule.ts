import type {
  EngineContext,
  EngineModule,
  ModuleRenderContext,
} from "@/engine/core/EngineModule";
import type { FrameInfo } from "@/engine/core/FrameLoop";
import { UniformBuffer } from "@/engine/graphics/buffers/UniformBuffer";
import {
  assertShaderCompiles,
  createRenderPipeline,
} from "@/engine/graphics/pipelines/PipelineFactory";
import {
  createSampler,
  TextureResource,
} from "@/engine/graphics/textures/TextureResource";
import {
  createVolumeData,
  DEFAULT_VOLUME_DIMENSIONS,
} from "@/modules/volume-rendering/volume-data";
import fragmentShaderSource from "@/modules/volume-rendering/volume.fragment.wgsl?raw";
import vertexShaderSource from "@/modules/volume-rendering/volume.vertex.wgsl?raw";

const PARAMETER_BYTES = 32;
const VOLUME_FORMAT: GPUTextureFormat = "rgba8unorm";

export class VolumeRenderingModule implements EngineModule {
  public readonly name = "Volume Rendering";

  public stepCount = 128;
  public densityScale = 1.05;
  public absorption = 1.55;
  public volumeSize = 3.2;

  private parameters: EngineContext["parameters"] | undefined;
  private parameterBuffer: UniformBuffer | undefined;
  private volumeTexture: TextureResource | undefined;
  private pipeline: GPURenderPipeline | undefined;
  private bindGroup: GPUBindGroup | undefined;
  private readonly parameterStorage = new ArrayBuffer(PARAMETER_BYTES);
  private readonly parameterFloats = new Float32Array(this.parameterStorage);
  private readonly parameterIntegers = new Uint32Array(this.parameterStorage);

  public async initialize(context: EngineContext): Promise<void> {
    const { gpu } = context;
    this.parameters = context.parameters;
    this.volumeTexture = new TextureResource(
      gpu.device,
      {
        label: "Volume density texture",
        size: {
          width: DEFAULT_VOLUME_DIMENSIONS.width,
          height: DEFAULT_VOLUME_DIMENSIONS.height,
          depthOrArrayLayers: DEFAULT_VOLUME_DIMENSIONS.depth,
        },
        dimension: "3d",
        format: VOLUME_FORMAT,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
      },
      { dimension: "3d" },
    );
    gpu.device.queue.writeTexture(
      { texture: this.volumeTexture.texture },
      createVolumeData(),
      {
        bytesPerRow: DEFAULT_VOLUME_DIMENSIONS.width * 4,
        rowsPerImage: DEFAULT_VOLUME_DIMENSIONS.height,
      },
      {
        width: DEFAULT_VOLUME_DIMENSIONS.width,
        height: DEFAULT_VOLUME_DIMENSIONS.height,
        depthOrArrayLayers: DEFAULT_VOLUME_DIMENSIONS.depth,
      },
    );

    this.parameterBuffer = new UniformBuffer(
      gpu.device,
      "Volume rendering parameters",
      PARAMETER_BYTES,
    );
    const sampler = createSampler(gpu.device, {
      label: "Volume density sampler",
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      addressModeW: "clamp-to-edge",
    });
    const vertex = gpu.device.createShaderModule({
      label: "Volume rendering vertex shader",
      code: vertexShaderSource,
    });
    const fragment = gpu.device.createShaderModule({
      label: "Volume rendering fragment shader",
      code: fragmentShaderSource,
    });
    await assertShaderCompiles(vertex, "Volume rendering vertex shader");
    await assertShaderCompiles(fragment, "Volume rendering fragment shader");

    const bindGroupLayout = gpu.device.createBindGroupLayout({
      label: "Volume rendering bind group layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: "float", viewDimension: "3d" },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: { type: "filtering" },
        },
        {
          binding: 3,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
      ],
    });
    this.pipeline = await createRenderPipeline(gpu.device, {
      label: "Volume rendering pipeline",
      layout: gpu.device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
      vertex: { module: vertex, entryPoint: "main" },
      fragment: {
        module: fragment,
        entryPoint: "main",
        targets: [{ format: gpu.presentationFormat }],
      },
      primitive: { topology: "triangle-list" },
    });
    this.bindGroup = gpu.device.createBindGroup({
      label: "Volume rendering bind group",
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: context.cameraUniforms.resource.buffer },
        },
        { binding: 1, resource: this.volumeTexture.view },
        { binding: 2, resource: sampler },
        {
          binding: 3,
          resource: { buffer: this.parameterBuffer.buffer },
        },
      ],
    });

    const folder = context.parameters.register(this.name);
    folder
      .add(this, "stepCount", 32, 256, 1)
      .name("Ray-march steps");
    folder.add(this, "densityScale", 0.05, 2, 0.05).name("Density");
    folder.add(this, "absorption", 0.1, 8, 0.1).name("Absorption");
    folder.add(this, "volumeSize", 1, 4, 0.05).name("Cloud size");
    if (window.matchMedia("(max-width: 700px)").matches) {
      this.stepCount = 72;
      folder.close();
    }
  }

  public update(_frame: FrameInfo): void {
    if (!this.parameterBuffer) {
      return;
    }

    this.parameterIntegers[0] = Math.round(this.stepCount);
    this.parameterFloats[1] = this.densityScale;
    this.parameterFloats[2] = this.absorption;
    this.parameterFloats[3] = 1 / DEFAULT_VOLUME_DIMENSIONS.width;
    this.parameterFloats[4] = this.volumeSize;
    this.parameterBuffer.write(this.parameterFloats);
  }

  public render({
    commandEncoder,
    colorView,
  }: ModuleRenderContext): void {
    if (!this.pipeline || !this.bindGroup) {
      throw new Error("Volume Rendering rendered before initialization.");
    }

    const pass = commandEncoder.beginRenderPass({
      label: "Volume ray-marching pass",
      colorAttachments: [
        {
          view: colorView,
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

  public destroy(): void {
    this.parameters?.remove(this.name);
    this.volumeTexture?.destroy();
    this.parameterBuffer?.destroy();
    this.bindGroup = undefined;
    this.pipeline = undefined;
    this.volumeTexture = undefined;
    this.parameterBuffer = undefined;
    this.parameters = undefined;
  }
}

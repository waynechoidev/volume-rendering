import { UniformBuffer } from "@/engine/graphics/buffers/UniformBuffer";
import { Module } from "@/engine/modules/Module";
import {
  createSampler,
  TextureResource,
} from "@/engine/graphics/textures/TextureResource";
import {
  createVolumeData,
  DEFAULT_VOLUME_DIMENSIONS,
} from "./volume-data";
import fragmentShaderSource from "./volume.fragment.wgsl?raw";

const PARAMETER_BYTES = 32;
const VOLUME_FORMAT: GPUTextureFormat = "rgba8unorm";

export class VolumeRenderingModule extends Module {
  public readonly name = "Volume Rendering";

  public stepCount = 128;
  public densityScale = 1.05;
  public absorption = 1.55;
  public volumeSize = 3.2;

  private parameterBuffer!: UniformBuffer;
  private volumeTexture: TextureResource | undefined;
  private pipeline!: GPURenderPipeline;
  private bindGroup!: GPUBindGroup;
  private readonly parameterStorage = new ArrayBuffer(PARAMETER_BYTES);
  private readonly parameterUint32 = new Uint32Array(this.parameterStorage);
  private readonly parameterFloats = new Float32Array(this.parameterStorage);

  public async setup(): Promise<void> {
    const vertex = await this.fullscreenVertexShader();
    const fragment = await this.compileShader(fragmentShaderSource, "fragment");

    this.volumeTexture = new TextureResource(
      this.device,
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
    this.device.queue.writeTexture(
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
      this.device,
      "Volume rendering parameters",
      PARAMETER_BYTES,
    );
    const sampler = createSampler(this.device, {
      label: "Volume density sampler",
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      addressModeW: "clamp-to-edge",
    });
    const bindGroupLayout = this.device.createBindGroupLayout({
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
    this.pipeline = await this.device.createRenderPipelineAsync({
      label: "Volume rendering pipeline",
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
      vertex: { module: vertex, entryPoint: "main" },
      fragment: {
        module: fragment,
        entryPoint: "main",
        targets: [{ format: this.presentationFormat }],
      },
      primitive: { topology: "triangle-list" },
    });
    this.bindGroup = this.device.createBindGroup({
      label: "Volume rendering bind group",
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.cameraUniforms.resource.buffer },
        },
        { binding: 1, resource: this.volumeTexture.view },
        { binding: 2, resource: sampler },
        {
          binding: 3,
          resource: { buffer: this.parameterBuffer.buffer },
        },
      ],
    });

    const folder = this.parameters.register(this.name);
    folder.add(this, "stepCount", 32, 256, 1).name("Ray-march steps");
    folder.add(this, "densityScale", 0.05, 2, 0.05).name("Density");
    folder.add(this, "absorption", 0.1, 8, 0.1).name("Absorption");
    folder.add(this, "volumeSize", 1, 4, 0.05).name("Cloud size");
    if (window.matchMedia("(max-width: 700px)").matches) {
      this.stepCount = 72;
      folder.close();
    }
  }

  public frame(): void {
    this.writeParameters();
    const pass = this.commandEncoder.beginRenderPass({
      label: "Volume ray-marching pass",
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

  public teardown(): void {
    this.volumeTexture?.destroy();
    this.parameterBuffer?.destroy();
    this.volumeTexture = undefined;
  }

  private writeParameters(): void {
    this.parameterUint32[0] = Math.round(this.stepCount);
    this.parameterFloats[1] = this.densityScale;
    this.parameterFloats[2] = this.absorption;
    this.parameterFloats[3] = 1 / DEFAULT_VOLUME_DIMENSIONS.width;
    this.parameterFloats[4] = this.volumeSize;
    this.parameterBuffer.write(this.parameterFloats);
  }
}

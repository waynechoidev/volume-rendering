import { UniformBuffer } from "@/engine/graphics/buffers/UniformBuffer";
import { Module } from "@/engine/modules/Module";
import {
  createSampler,
  TextureResource,
} from "@/engine/graphics/textures/TextureResource";
import type {
  TransferFunction2DEditor,
  TransferRegion2D,
} from "@/engine/ui/TransferFunction2DEditor";
import volumeDataUrl from "@/data/aneurism/aneurism.uint8.raw?url&no-inline";
import gradientComputeSource from "./gradient.compute.wgsl?raw";
import fragmentShaderSource from "./volume.fragment.wgsl?raw";

const PARAMETER_BYTES = 80;
const VOLUME_WIDTH = 256;
const VOLUME_HEIGHT = 256;
const VOLUME_DEPTH = 256;
const INTENSITY_MAXIMUM = 255;
const GRADIENT_MAXIMUM = 128;
const HISTOGRAM_WIDTH = 128;
const HISTOGRAM_HEIGHT = 96;
const EXPECTED_BYTES =
  VOLUME_WIDTH * VOLUME_HEIGHT * VOLUME_DEPTH;

type TransferPreset =
  | "Boundary + Core"
  | "Vessel boundary"
  | "Dense core"
  | "Custom";

export class VolumeRenderingModule extends Module {
  public readonly name = "2D Transfer Function";

  public preset: TransferPreset = "Boundary + Core";
  public stepCount = 448;
  public opacityScale = 1;
  public volumeSize = 2;

  private readonly vesselRegion: TransferRegion2D = {
    label: "Vessel boundary",
    color: "#ff4f5e",
    intensityMinimum: 18,
    intensityMaximum: 210,
    gradientMinimum: 4,
    gradientMaximum: 105,
    opacity: 1.6,
  };
  private readonly denseCoreRegion: TransferRegion2D = {
    label: "Dense vessel core",
    color: "#fff2da",
    intensityMinimum: 145,
    intensityMaximum: 255,
    gradientMinimum: 0,
    gradientMaximum: 72,
    opacity: 1.1,
  };
  private intensityTexture: TextureResource | undefined;
  private gradientTexture: TextureResource | undefined;
  private parameterBuffer!: UniformBuffer;
  private pipeline!: GPURenderPipeline;
  private bindGroup!: GPUBindGroup;
  private transferEditor: TransferFunction2DEditor | undefined;
  private readonly parameterStorage = new ArrayBuffer(PARAMETER_BYTES);
  private readonly parameterUint32 = new Uint32Array(this.parameterStorage);
  private readonly parameterFloats = new Float32Array(this.parameterStorage);

  public async setup(): Promise<void> {
    const vertex = await this.fullscreenVertexShader();
    const fragment = await this.compileShader(fragmentShaderSource, "fragment");
    const compute = await this.compileShader(gradientComputeSource, "compute");
    const volumeData = await this.loadVolumeData();

    this.createVolumeTextures(volumeData);
    await this.computeGradientTexture(compute);
    this.createRenderPipeline(vertex, fragment);
    this.createControls(volumeData);
  }

  public frame(): void {
    this.writeParameters();
    const pass = this.commandEncoder.beginRenderPass({
      label: "CT 2D transfer-function ray-marching pass",
      colorAttachments: [{
        view: this.colorView,
        clearValue: { r: 0.015, g: 0.018, b: 0.024, a: 1 },
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
    this.intensityTexture?.destroy();
    this.gradientTexture?.destroy();
    this.parameterBuffer?.destroy();
    this.intensityTexture = undefined;
    this.gradientTexture = undefined;
    this.transferEditor = undefined;
  }

  private createVolumeTextures(volumeData: Uint8Array<ArrayBuffer>): void {
    const size = {
      width: VOLUME_WIDTH,
      height: VOLUME_HEIGHT,
      depthOrArrayLayers: VOLUME_DEPTH,
    };
    this.intensityTexture = new TextureResource(
      this.device,
      {
        label: "Aneurism intensity texture",
        size,
        dimension: "3d",
        format: "r8unorm",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
      },
      { dimension: "3d" },
    );
    this.gradientTexture = new TextureResource(
      this.device,
      {
        label: "Aneurism gradient texture",
        size,
        dimension: "3d",
        format: "rgba8unorm",
        usage:
          GPUTextureUsage.STORAGE_BINDING |
          GPUTextureUsage.TEXTURE_BINDING,
      },
      { dimension: "3d" },
    );
    this.device.queue.writeTexture(
      { texture: this.intensityTexture.texture },
      volumeData,
      {
        bytesPerRow: VOLUME_WIDTH,
        rowsPerImage: VOLUME_HEIGHT,
      },
      size,
    );
  }

  private async computeGradientTexture(
    shader: GPUShaderModule,
  ): Promise<void> {
    const layout = this.device.createBindGroupLayout({
      label: "CT gradient compute layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          texture: { sampleType: "float", viewDimension: "3d" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          storageTexture: {
            access: "write-only",
            format: "rgba8unorm",
            viewDimension: "3d",
          },
        },
      ],
    });
    const pipeline = await this.device.createComputePipelineAsync({
      label: "CT gradient compute pipeline",
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [layout] }),
      compute: { module: shader, entryPoint: "main" },
    });
    const bindGroup = this.device.createBindGroup({
      label: "CT gradient compute bind group",
      layout,
      entries: [
        { binding: 0, resource: this.intensityTexture!.view },
        { binding: 1, resource: this.gradientTexture!.view },
      ],
    });
    const encoder = this.device.createCommandEncoder({
      label: "CT gradient preprocessing",
    });
    const pass = encoder.beginComputePass({ label: "CT central differences" });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(
      Math.ceil(VOLUME_WIDTH / 4),
      Math.ceil(VOLUME_HEIGHT / 4),
      Math.ceil(VOLUME_DEPTH / 4),
    );
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  private createRenderPipeline(
    vertex: GPUShaderModule,
    fragment: GPUShaderModule,
  ): void {
    this.parameterBuffer = new UniformBuffer(
      this.device,
      "2D transfer-function parameters",
      PARAMETER_BYTES,
    );
    const sampler = createSampler(this.device, {
      label: "Gradient texture sampler",
      magFilter: "linear",
      minFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      addressModeW: "clamp-to-edge",
    });
    const layout = this.device.createBindGroupLayout({
      label: "CT 2D transfer-function layout",
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
          texture: { sampleType: "float", viewDimension: "3d" },
        },
        {
          binding: 3,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: { type: "filtering" },
        },
        {
          binding: 4,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
      ],
    });
    this.pipeline = this.device.createRenderPipeline({
      label: "CT 2D transfer-function pipeline",
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [layout] }),
      vertex: { module: vertex, entryPoint: "main" },
      fragment: {
        module: fragment,
        entryPoint: "main",
        targets: [{ format: this.presentationFormat }],
      },
    });
    this.bindGroup = this.device.createBindGroup({
      label: "CT 2D transfer-function bind group",
      layout,
      entries: [
        { binding: 0, resource: { buffer: this.cameraUniforms.resource.buffer } },
        { binding: 1, resource: this.intensityTexture!.view },
        { binding: 2, resource: this.gradientTexture!.view },
        { binding: 3, resource: sampler },
        { binding: 4, resource: { buffer: this.parameterBuffer.buffer } },
      ],
    });
  }

  private createControls(volumeData: Uint8Array): void {
    const folder = this.parameters.register(this.name);
    this.parameters.open();
    folder
      .add(this, "preset", [
        "Boundary + Core",
        "Vessel boundary",
        "Dense core",
        "Custom",
      ])
      .name("Transfer preset")
      .onChange(() => this.applyPreset())
      .listen();
    folder.add(this, "stepCount", 64, 512, 1).name("Ray-march steps");
    folder.add(this, "opacityScale", 0, 3, 0.01).name("Opacity scale");
    folder.add(this, "volumeSize", 1, 5, 0.05).name("Volume size");
    this.transferEditor = folder.addTransferFunction2D({
      histogram: this.createJointHistogram(volumeData),
      histogramWidth: HISTOGRAM_WIDTH,
      histogramHeight: HISTOGRAM_HEIGHT,
      intensityMaximum: INTENSITY_MAXIMUM,
      gradientMaximum: GRADIENT_MAXIMUM,
      regions: [this.vesselRegion, this.denseCoreRegion],
      onChange: () => {
        this.preset = "Custom";
      },
    });
    if (window.matchMedia("(max-width: 700px)").matches) {
      this.stepCount = 288;
    }
  }

  private writeParameters(): void {
    this.parameterUint32[0] = Math.round(this.stepCount);
    this.parameterFloats[1] = this.opacityScale;
    this.parameterFloats[2] = GRADIENT_MAXIMUM;
    this.parameterFloats[3] = INTENSITY_MAXIMUM;
    this.parameterFloats[4] = this.volumeSize;
    this.parameterFloats[5] = this.volumeSize;
    this.parameterFloats[6] = this.volumeSize;
    this.parameterFloats[8] = this.vesselRegion.intensityMinimum;
    this.parameterFloats[9] = this.vesselRegion.intensityMaximum;
    this.parameterFloats[10] = this.vesselRegion.gradientMinimum;
    this.parameterFloats[11] = this.vesselRegion.gradientMaximum;
    this.parameterFloats[12] = this.vesselRegion.opacity;
    this.parameterFloats[13] = this.denseCoreRegion.intensityMinimum;
    this.parameterFloats[14] = this.denseCoreRegion.intensityMaximum;
    this.parameterFloats[15] = this.denseCoreRegion.gradientMinimum;
    this.parameterFloats[16] = this.denseCoreRegion.gradientMaximum;
    this.parameterFloats[17] = this.denseCoreRegion.opacity;
    this.parameterBuffer.write(this.parameterFloats);
  }

  private async loadVolumeData(): Promise<Uint8Array<ArrayBuffer>> {
    const response = await fetch(volumeDataUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to load Aneurism volume (${response.status} ${response.statusText}).`,
      );
    }
    const storage = await response.arrayBuffer();
    if (storage.byteLength !== EXPECTED_BYTES) {
      throw new Error(
        `Aneurism volume has ${storage.byteLength} bytes; expected ${EXPECTED_BYTES}.`,
      );
    }
    return new Uint8Array(storage);
  }

  private applyPreset(): void {
    if (this.preset === "Custom") return;
    if (this.preset === "Vessel boundary") {
      this.vesselRegion.opacity = 2;
      this.denseCoreRegion.opacity = 0;
    } else if (this.preset === "Dense core") {
      this.vesselRegion.opacity = 0;
      this.denseCoreRegion.opacity = 2;
    } else {
      this.vesselRegion.opacity = 1.6;
      this.denseCoreRegion.opacity = 1.1;
    }
    this.transferEditor?.updateDisplay();
  }

  private createJointHistogram(data: Uint8Array): Uint32Array {
    const histogram = new Uint32Array(HISTOGRAM_WIDTH * HISTOGRAM_HEIGHT);
    const indexOf = (x: number, y: number, z: number): number =>
      x + VOLUME_WIDTH * (y + VOLUME_HEIGHT * z);
    for (let z = 1; z < VOLUME_DEPTH - 1; z += 2) {
      for (let y = 1; y < VOLUME_HEIGHT - 1; y += 2) {
        for (let x = 1; x < VOLUME_WIDTH - 1; x += 2) {
          const center = data[indexOf(x, y, z)] ?? 0;
          if (center === 0) continue;
          const dx =
            ((data[indexOf(x + 1, y, z)] ?? 0) -
              (data[indexOf(x - 1, y, z)] ?? 0)) * 0.5;
          const dy =
            ((data[indexOf(x, y + 1, z)] ?? 0) -
              (data[indexOf(x, y - 1, z)] ?? 0)) * 0.5;
          const dz =
            ((data[indexOf(x, y, z + 1)] ?? 0) -
              (data[indexOf(x, y, z - 1)] ?? 0)) * 0.5;
          const gradient = Math.hypot(dx, dy, dz);
          const intensityBin = Math.min(
            HISTOGRAM_WIDTH - 1,
            Math.floor((center / INTENSITY_MAXIMUM) * HISTOGRAM_WIDTH),
          );
          const gradientBin = Math.min(
            HISTOGRAM_HEIGHT - 1,
            Math.floor((gradient / GRADIENT_MAXIMUM) * HISTOGRAM_HEIGHT),
          );
          const histogramIndex =
            intensityBin + gradientBin * HISTOGRAM_WIDTH;
          histogram[histogramIndex] =
            (histogram[histogramIndex] ?? 0) + 1;
        }
      }
    }
    return histogram;
  }
}

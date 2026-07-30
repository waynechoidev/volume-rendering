import { UniformBuffer } from "@/engine/graphics/buffers/UniformBuffer";
import {
  createSampler,
  TextureResource,
} from "@/engine/graphics/textures/TextureResource";
import { Module } from "@/engine/modules/Module";
import type {
  ScalarTransferBand,
  ScalarTransferFunctionEditor,
} from "@/engine/ui/ScalarTransferFunctionEditor";
import volumeDataUrl from "@/data/aneurism/aneurism.uint8.raw?url&no-inline";
import fragmentShaderSource from "./volume.fragment.wgsl?raw";

const PARAMETER_BYTES = 64;
const VOLUME_SIZE = 256;
const INTENSITY_MAXIMUM = 255;
const HISTOGRAM_BINS = 256;
const EXPECTED_BYTES = VOLUME_SIZE ** 3;

type TransferPreset =
  | "Both intensity bands"
  | "Vessel intensity band"
  | "High-intensity core"
  | "Custom";

export class VolumeRenderingModule extends Module {
  public readonly name = "Aneurism 1D Transfer Function";

  public preset: TransferPreset = "Both intensity bands";
  public stepCount = 448;
  public opacityScale = 1;
  public volumeSize = 2;

  private readonly vesselBand: ScalarTransferBand = {
    label: "Vessels",
    color: "#f04452",
    minimum: 18,
    maximum: 180,
    opacity: 0.18,
  };
  private readonly denseCoreBand: ScalarTransferBand = {
    label: "Dense core",
    color: "#fff0d2",
    minimum: 145,
    maximum: 255,
    opacity: 0.32,
  };
  private volumeTexture: TextureResource | undefined;
  private parameterBuffer!: UniformBuffer;
  private pipeline!: GPURenderPipeline;
  private bindGroup!: GPUBindGroup;
  private transferEditor: ScalarTransferFunctionEditor | undefined;
  private readonly parameterStorage = new ArrayBuffer(PARAMETER_BYTES);
  private readonly parameterUint32 = new Uint32Array(this.parameterStorage);
  private readonly parameterFloats = new Float32Array(this.parameterStorage);

  public async setup(): Promise<void> {
    const vertex = await this.fullscreenVertexShader();
    const fragment = await this.compileShader(fragmentShaderSource, "fragment");
    const volumeData = await this.loadVolumeData();

    this.createVolumeTexture(volumeData);
    this.createRenderPipeline(vertex, fragment);
    this.createControls(volumeData);
  }

  public frame(): void {
    this.writeParameters();
    const pass = this.commandEncoder.beginRenderPass({
      label: "Aneurism 1D transfer-function ray-marching pass",
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
    this.volumeTexture?.destroy();
    this.parameterBuffer?.destroy();
    this.volumeTexture = undefined;
    this.transferEditor = undefined;
  }

  private createVolumeTexture(volumeData: Uint8Array<ArrayBuffer>): void {
    const size = {
      width: VOLUME_SIZE,
      height: VOLUME_SIZE,
      depthOrArrayLayers: VOLUME_SIZE,
    };
    this.volumeTexture = new TextureResource(
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
    this.device.queue.writeTexture(
      { texture: this.volumeTexture.texture },
      volumeData,
      { bytesPerRow: VOLUME_SIZE, rowsPerImage: VOLUME_SIZE },
      size,
    );
  }

  private createRenderPipeline(
    vertex: GPUShaderModule,
    fragment: GPUShaderModule,
  ): void {
    this.parameterBuffer = new UniformBuffer(
      this.device,
      "Aneurism 1D transfer-function parameters",
      PARAMETER_BYTES,
    );
    const sampler = createSampler(this.device, {
      label: "Aneurism volume sampler",
      magFilter: "linear",
      minFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      addressModeW: "clamp-to-edge",
    });
    const layout = this.device.createBindGroupLayout({
      label: "Aneurism 1D transfer-function layout",
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
    this.pipeline = this.device.createRenderPipeline({
      label: "Aneurism 1D transfer-function pipeline",
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [layout] }),
      vertex: { module: vertex, entryPoint: "main" },
      fragment: {
        module: fragment,
        entryPoint: "main",
        targets: [{ format: this.presentationFormat }],
      },
    });
    this.bindGroup = this.device.createBindGroup({
      label: "Aneurism 1D transfer-function bind group",
      layout,
      entries: [
        { binding: 0, resource: { buffer: this.cameraUniforms.resource.buffer } },
        { binding: 1, resource: this.volumeTexture!.view },
        { binding: 2, resource: sampler },
        { binding: 3, resource: { buffer: this.parameterBuffer.buffer } },
      ],
    });
  }

  private createControls(volumeData: Uint8Array): void {
    const folder = this.parameters.register(this.name);
    this.parameters.open();
    folder
      .add(this, "preset", [
        "Both intensity bands",
        "Vessel intensity band",
        "High-intensity core",
        "Custom",
      ])
      .name("Transfer preset")
      .onChange(() => this.applyPreset())
      .listen();
    folder.add(this, "stepCount", 64, 512, 1).name("Ray-march steps");
    folder.add(this, "opacityScale", 0, 6, 0.01).name("Opacity scale");
    folder.add(this, "volumeSize", 1, 5, 0.05).name("Volume size");
    this.transferEditor = folder.addTransferFunction({
      histogram: this.createHistogram(volumeData),
      domainMinimum: 0,
      domainMaximum: INTENSITY_MAXIMUM,
      bands: [this.vesselBand, this.denseCoreBand],
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
    this.parameterFloats[2] = INTENSITY_MAXIMUM;
    this.parameterFloats[4] = this.volumeSize;
    this.parameterFloats[5] = this.volumeSize;
    this.parameterFloats[6] = this.volumeSize;
    this.parameterFloats[8] = this.vesselBand.minimum;
    this.parameterFloats[9] = this.vesselBand.maximum;
    this.parameterFloats[10] = this.vesselBand.opacity;
    this.parameterFloats[12] = this.denseCoreBand.minimum;
    this.parameterFloats[13] = this.denseCoreBand.maximum;
    this.parameterFloats[14] = this.denseCoreBand.opacity;
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
    if (this.preset === "Vessel intensity band") {
      this.vesselBand.opacity = 0.22;
      this.denseCoreBand.opacity = 0;
    } else if (this.preset === "High-intensity core") {
      this.vesselBand.opacity = 0;
      this.denseCoreBand.opacity = 0.38;
    } else {
      this.vesselBand.opacity = 0.18;
      this.denseCoreBand.opacity = 0.32;
    }
    this.transferEditor?.updateDisplay();
  }

  private createHistogram(data: Uint8Array): Uint32Array {
    const histogram = new Uint32Array(HISTOGRAM_BINS);
    for (const intensity of data) {
      histogram[intensity] = (histogram[intensity] ?? 0) + 1;
    }
    return histogram;
  }
}

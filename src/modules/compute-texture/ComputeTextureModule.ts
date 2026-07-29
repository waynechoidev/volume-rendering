import { UniformBuffer } from "@/engine/graphics/buffers/UniformBuffer";
import { TextureResource } from "@/engine/graphics/textures/TextureResource";
import { Module } from "@/engine/modules/Module";
import fullscreenVertexSource from "@/engine/shaders/fullscreen.vertex.wgsl?raw";
import computeShaderSource from "@/modules/compute-texture/compute-texture.compute.wgsl?raw";
import { calculateDispatchSize } from "@/modules/compute-texture/dispatch";
import fragmentShaderSource from "@/modules/compute-texture/compute-texture.fragment.wgsl?raw";

const OUTPUT_FORMAT: GPUTextureFormat = "rgba8unorm";
const PARAMETER_BYTES = 32;

export class ComputeTextureModule extends Module {
  public readonly name = "Compute Texture";
  public scale = 2.2;
  public speed = 0.65;
  public contrast = 0.72;

  private uniforms!: UniformBuffer;
  private output: TextureResource | undefined;
  private computePipeline!: GPUComputePipeline;
  private renderPipeline!: GPURenderPipeline;
  private computeBindGroup!: GPUBindGroup;
  private renderBindGroup!: GPUBindGroup;
  private readonly parameterStorage = new ArrayBuffer(PARAMETER_BYTES);

  public async setup(): Promise<void> {
    const compute = await this.compileShader(computeShaderSource, "compute");
    const vertex = await this.compileShader(fullscreenVertexSource, "vertex");
    const fragment = await this.compileShader(fragmentShaderSource, "fragment");

    this.uniforms = new UniformBuffer(
      this.device,
      "Compute texture parameters",
      PARAMETER_BYTES,
    );
    this.computePipeline = await this.device.createComputePipelineAsync({
      label: "Compute texture compute pipeline",
      layout: "auto",
      compute: { module: compute, entryPoint: "main" },
    });
    this.renderPipeline = await this.device.createRenderPipelineAsync({
      label: "Compute texture render pipeline",
      layout: "auto",
      vertex: { module: vertex, entryPoint: "main" },
      fragment: {
        module: fragment,
        entryPoint: "main",
        targets: [{ format: this.gpu.presentationFormat }],
      },
      primitive: { topology: "triangle-list" },
    });

    const folder = this.parameters.register(this.name);
    folder.add(this, "scale", 0.5, 6, 0.05).name("Pattern scale");
    folder.add(this, "speed", 0, 2, 0.05).name("Animation speed");
    folder.add(this, "contrast", 0.1, 1.5, 0.05).name("Contrast");
    if (window.matchMedia("(max-width: 700px)").matches) folder.close();
  }

  public resizeResources(): void {
    const output = new TextureResource(this.device, {
      label: "Compute texture output",
      size: this.size,
      format: OUTPUT_FORMAT,
      usage:
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.TEXTURE_BINDING,
    });
    this.computeBindGroup = this.device.createBindGroup({
      label: "Compute texture compute bind group",
      layout: this.computePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: output.view },
        { binding: 1, resource: { buffer: this.uniforms.buffer } },
      ],
    });
    this.renderBindGroup = this.device.createBindGroup({
      label: "Compute texture render bind group",
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: output.view }],
    });
    this.output?.destroy();
    this.output = output;
  }

  public frame(): void {
    const floats = new Float32Array(this.parameterStorage);
    const integers = new Uint32Array(this.parameterStorage);
    integers[0] = this.size.width;
    integers[1] = this.size.height;
    floats[2] = this.time;
    floats[3] = this.scale;
    floats[4] = this.speed;
    floats[5] = this.contrast;
    this.uniforms.write(floats);

    const dispatch = calculateDispatchSize(this.size.width, this.size.height);
    const compute = this.commandEncoder.beginComputePass({
      label: "Compute texture pass",
    });
    compute.setPipeline(this.computePipeline);
    compute.setBindGroup(0, this.computeBindGroup);
    compute.dispatchWorkgroups(dispatch.x, dispatch.y);
    compute.end();

    const render = this.commandEncoder.beginRenderPass({
      label: "Compute texture fullscreen pass",
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
    this.uniforms?.destroy();
  }
}

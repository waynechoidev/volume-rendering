import type { CanvasSize } from "@/engine/core/CanvasSize";
import type { ModuleRenderContext } from "@/engine/core/EngineModule";
import { createBindGroup } from "@/engine/graphics/bind-groups/BindGroupFactory";
import {
  createDepthTexture,
  type TextureResource,
} from "@/engine/graphics/textures/TextureResource";

const DEPTH_FORMAT: GPUTextureFormat = "depth24plus";

export class ParticleRenderer {
  private readonly bindGroupLayout: GPUBindGroupLayout;
  private readonly pipeline: GPURenderPipeline;
  private bindGroups: readonly [GPUBindGroup, GPUBindGroup] | undefined;
  private depthTexture: TextureResource | undefined;
  private particleCount = 0;

  private constructor(
    private readonly device: GPUDevice,
    bindGroupLayout: GPUBindGroupLayout,
    pipeline: GPURenderPipeline,
    private readonly cameraBuffer: GPUBuffer,
    private readonly parameterBuffer: GPUBuffer,
  ) {
    this.bindGroupLayout = bindGroupLayout;
    this.pipeline = pipeline;
  }

  public static async create(
    device: GPUDevice,
    presentationFormat: GPUTextureFormat,
    cameraBuffer: GPUBuffer,
    parameterBuffer: GPUBuffer,
    vertexShader: GPUShaderModule,
    fragmentShader: GPUShaderModule,
  ): Promise<ParticleRenderer> {
    const bindGroupLayout = device.createBindGroupLayout({
      label: "Particle render bind group layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "uniform" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "read-only-storage" },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "uniform" },
        },
      ],
    });
    const pipeline = await device.createRenderPipelineAsync({
      label: "Particle render pipeline",
      layout: device.createPipelineLayout({
        label: "Particle render pipeline layout",
        bindGroupLayouts: [bindGroupLayout],
      }),
      vertex: {
        module: vertexShader,
        entryPoint: "main",
      },
      fragment: {
        module: fragmentShader,
        entryPoint: "main",
        targets: [
          {
            format: presentationFormat,
            blend: {
              color: {
                srcFactor: "src-alpha",
                dstFactor: "one",
                operation: "add",
              },
              alpha: {
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
                operation: "add",
              },
            },
          },
        ],
      },
      primitive: {
        topology: "triangle-list",
        cullMode: "none",
      },
      depthStencil: {
        format: DEPTH_FORMAT,
        depthCompare: "less",
        depthWriteEnabled: false,
      },
    });
    return new ParticleRenderer(
      device,
      bindGroupLayout,
      pipeline,
      cameraBuffer,
      parameterBuffer,
    );
  }

  public setParticleBuffers(
    buffers: readonly [GPUBuffer, GPUBuffer],
    count: number,
  ): void {
    this.particleCount = count;
    this.bindGroups = [
      this.createParticleBindGroup(buffers[0], "A"),
      this.createParticleBindGroup(buffers[1], "B"),
    ];
  }

  public resize(size: CanvasSize): void {
    this.depthTexture?.destroy();
    this.depthTexture = createDepthTexture(
      this.device,
      size.width,
      size.height,
      DEPTH_FORMAT,
    );
  }

  public render(context: ModuleRenderContext, bufferIndex: number): void {
    const bindGroup = this.bindGroups?.[bufferIndex];
    if (!bindGroup || !this.depthTexture) {
      throw new Error("Particle renderer resources are not initialized.");
    }

    const renderPass = context.commandEncoder.beginRenderPass({
      label: "Particle render pass",
      colorAttachments: [
        {
          view: context.colorView,
          clearValue: { r: 0.006, g: 0.01, b: 0.025, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: this.depthTexture.view,
        depthClearValue: 1,
        depthLoadOp: "clear",
        depthStoreOp: "discard",
      },
    });
    renderPass.setPipeline(this.pipeline);
    renderPass.setBindGroup(0, bindGroup);
    renderPass.draw(6, this.particleCount);
    renderPass.end();
  }

  public destroy(): void {
    this.depthTexture?.destroy();
    this.depthTexture = undefined;
    this.bindGroups = undefined;
  }

  private createParticleBindGroup(
    particleBuffer: GPUBuffer,
    suffix: string,
  ): GPUBindGroup {
    return createBindGroup(
      this.device,
      `Particle render bind group ${suffix}`,
      this.bindGroupLayout,
      [
        { binding: 0, resource: { buffer: this.cameraBuffer } },
        { binding: 1, resource: { buffer: particleBuffer } },
        { binding: 2, resource: { buffer: this.parameterBuffer } },
      ],
    );
  }
}

import type { CanvasSize } from "../../core/CanvasSize";
import type {
  EngineContext,
  EngineModule,
  ModuleRenderContext,
} from "../../core/EngineModule";
import type { FrameInfo } from "../../core/FrameLoop";
import shaderSource from "./triangle.wgsl?raw";

export class TriangleModule implements EngineModule {
  public readonly name = "triangle";

  private pipeline: GPURenderPipeline | undefined;
  private bindGroup: GPUBindGroup | undefined;
  private canvasUniformBuffer: GPUBuffer | undefined;
  private device: GPUDevice | undefined;
  private readonly canvasUniformData = new Float32Array(4);

  public async initialize({ gpu }: EngineContext): Promise<void> {
    this.device = gpu.device;
    const shaderModule = gpu.device.createShaderModule({
      label: "Triangle shader",
      code: shaderSource,
    });

    const compilationInfo = await shaderModule.getCompilationInfo();
    const errors = compilationInfo.messages.filter(
      ({ type }) => type === "error",
    );

    if (errors.length > 0) {
      const details = errors
        .map(
          ({ lineNum, linePos, message }) =>
            `line ${lineNum}:${linePos} ${message}`,
        )
        .join("\n");
      throw new Error(`Triangle shader compilation failed:\n${details}`);
    }

    this.pipeline = await gpu.device.createRenderPipelineAsync({
      label: "Triangle render pipeline",
      layout: "auto",
      vertex: {
        module: shaderModule,
        entryPoint: "vertex_main",
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fragment_main",
        targets: [{ format: gpu.presentationFormat }],
      },
      primitive: {
        topology: "triangle-list",
        cullMode: "none",
      },
    });

    this.canvasUniformBuffer = gpu.device.createBuffer({
      label: "Triangle canvas uniforms",
      size: this.canvasUniformData.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.bindGroup = gpu.device.createBindGroup({
      label: "Triangle bind group",
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: this.canvasUniformBuffer },
        },
      ],
    });
  }

  public update(_frame: FrameInfo): void {}

  public render({
    commandEncoder,
    colorView,
  }: ModuleRenderContext): void {
    if (!this.pipeline || !this.bindGroup) {
      throw new Error("TriangleModule rendered before initialization.");
    }

    const renderPass = commandEncoder.beginRenderPass({
      label: "Triangle render pass",
      colorAttachments: [
        {
          view: colorView,
          clearValue: { r: 0.018, g: 0.027, b: 0.055, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    renderPass.setPipeline(this.pipeline);
    renderPass.setBindGroup(0, this.bindGroup);
    renderPass.draw(3);
    renderPass.end();
  }

  public resize(size: CanvasSize): void {
    if (!this.device || !this.canvasUniformBuffer) {
      return;
    }

    const shortestSide = Math.min(size.width, size.height);
    this.canvasUniformData[0] = shortestSide / size.width;
    this.canvasUniformData[1] = shortestSide / size.height;
    this.device.queue.writeBuffer(
      this.canvasUniformBuffer,
      0,
      this.canvasUniformData,
    );
  }

  public destroy(): void {
    this.canvasUniformBuffer?.destroy();
    this.canvasUniformBuffer = undefined;
    this.bindGroup = undefined;
    this.pipeline = undefined;
    this.device = undefined;
  }
}

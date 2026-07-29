import type {
  EngineContext,
  EngineModule,
  ModuleRenderContext,
} from "@/engine/core/EngineModule";
import {
  assertShaderCompiles,
  createRenderPipeline,
} from "@/engine/graphics/pipelines/PipelineFactory";
import fragmentShaderSource from "@/modules/triangle/triangle.fragment.wgsl?raw";
import vertexShaderSource from "@/modules/triangle/triangle.vertex.wgsl?raw";

export class TriangleModule implements EngineModule {
  public readonly name = "Triangle";

  private pipeline: GPURenderPipeline | undefined;

  public async initialize({ gpu }: EngineContext): Promise<void> {
    const vertex = gpu.device.createShaderModule({
      label: "Triangle vertex shader",
      code: vertexShaderSource,
    });
    const fragment = gpu.device.createShaderModule({
      label: "Triangle fragment shader",
      code: fragmentShaderSource,
    });
    await assertShaderCompiles(vertex, "Triangle vertex shader");
    await assertShaderCompiles(fragment, "Triangle fragment shader");
    this.pipeline = await createRenderPipeline(gpu.device, {
      label: "Triangle render pipeline",
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

  public render({
    commandEncoder,
    colorView,
  }: ModuleRenderContext): void {
    if (!this.pipeline) {
      throw new Error("Triangle rendered before initialization.");
    }

    const pass = commandEncoder.beginRenderPass({
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
    pass.setPipeline(this.pipeline);
    pass.draw(3);
    pass.end();
  }
}

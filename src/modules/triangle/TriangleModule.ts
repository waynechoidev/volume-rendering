import { Module } from "@/engine/modules/Module";
import fragmentShaderSource from "@/modules/triangle/triangle.fragment.wgsl?raw";
import vertexShaderSource from "@/modules/triangle/triangle.vertex.wgsl?raw";

export class TriangleModule extends Module {
  public readonly name = "Triangle";

  private pipeline!: GPURenderPipeline;

  public async setup(): Promise<void> {
    const vertex = await this.compileShader(vertexShaderSource, "vertex");
    const fragment = await this.compileShader(fragmentShaderSource, "fragment");

    this.pipeline = await this.device.createRenderPipelineAsync({
      label: "Triangle render pipeline",
      layout: "auto",
      vertex: { module: vertex, entryPoint: "main" },
      fragment: {
        module: fragment,
        entryPoint: "main",
        targets: [{ format: this.presentationFormat }],
      },
      primitive: { topology: "triangle-list" },
    });
  }

  public frame(): void {
    const pass = this.commandEncoder.beginRenderPass({
      label: "Triangle render pass",
      colorAttachments: [
        {
          view: this.colorView,
          clearValue: { r: 0.01, g: 0.015, b: 0.03, a: 1 },
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

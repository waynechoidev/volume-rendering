import { assertShaderCompiles } from "@/engine/graphics/shaders/ShaderCompiler";
import fullscreenVertexSource from "@/engine/shaders/fullscreen.vertex.wgsl?raw";

export class ShaderLibrary {
  private fullscreenVertexShader: Promise<GPUShaderModule> | undefined;

  public constructor(private readonly device: GPUDevice) {}

  public getFullscreenVertex(): Promise<GPUShaderModule> {
    this.fullscreenVertexShader ??= this.compile(
      fullscreenVertexSource,
      "Fullscreen vertex shader",
    );
    return this.fullscreenVertexShader;
  }

  private async compile(
    source: string,
    label: string,
  ): Promise<GPUShaderModule> {
    const shader = this.device.createShaderModule({ label, code: source });
    await assertShaderCompiles(shader, label);
    return shader;
  }
}

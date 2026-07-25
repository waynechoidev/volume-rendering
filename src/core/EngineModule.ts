import type { CanvasSize } from "./CanvasSize";
import type { FrameInfo } from "./FrameLoop";
import type { GPUContext } from "./GPUContext";

export interface ModuleRenderContext {
  readonly commandEncoder: GPUCommandEncoder;
  readonly colorView: GPUTextureView;
  readonly size: CanvasSize;
  readonly frame: FrameInfo;
}

export interface EngineModule {
  readonly name: string;

  initialize(gpu: GPUContext): void | Promise<void>;
  update(frame: FrameInfo): void;
  render(context: ModuleRenderContext): void;
  resize(size: CanvasSize): void;
  destroy(): void;
}

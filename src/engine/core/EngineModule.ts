import type { CanvasSize } from "./CanvasSize";
import type { FrameInfo } from "./FrameLoop";
import type { GPUContext } from "./GPUContext";
import type { PerspectiveCamera } from "../camera/PerspectiveCamera";
import type { CameraUniforms } from "../camera/CameraUniforms";
import type { InputManager } from "../input/InputManager";
import type { ParameterRegistry } from "../ui/ParameterRegistry";
import type { Stats } from "../ui/Stats";

export interface EngineContext {
  readonly gpu: GPUContext;
  readonly camera: PerspectiveCamera;
  readonly cameraUniforms: CameraUniforms;
  readonly input: InputManager;
  readonly parameters: ParameterRegistry;
  readonly stats: Stats;
}

export interface ModuleRenderContext {
  readonly commandEncoder: GPUCommandEncoder;
  readonly colorView: GPUTextureView;
  readonly size: CanvasSize;
  readonly frame: FrameInfo;
}

export interface EngineModule {
  readonly name: string;

  initialize(context: EngineContext): void | Promise<void>;
  update(frame: FrameInfo): void;
  render(context: ModuleRenderContext): void;
  resize(size: CanvasSize): void;
  destroy(): void;
}

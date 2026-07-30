import type { CanvasSize } from "@/engine/core/CanvasSize";
import type { FrameInfo } from "@/engine/core/FrameLoop";
import type { GPUContext } from "@/engine/core/GPUContext";
import type { ShaderLibrary } from "@/engine/graphics/shaders/ShaderLibrary";
import type { PerspectiveCamera } from "@/engine/camera/PerspectiveCamera";
import type { CameraUniforms } from "@/engine/camera/CameraUniforms";
import type { InputManager } from "@/engine/input/InputManager";
import type { ParameterRegistry } from "@/engine/ui/ParameterRegistry";
import type { Stats } from "@/engine/ui/Stats";

export interface EngineContext {
  readonly gpu: GPUContext;
  readonly shaders: ShaderLibrary;
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

export interface ModuleCameraView {
  readonly yaw: number;
  readonly pitch: number;
  readonly distance: number;
  readonly target?: readonly [number, number, number];
}

export interface EngineModule {
  readonly name: string;
  readonly initialCameraView?: ModuleCameraView;

  initialize(context: EngineContext): void | Promise<void>;
  render(context: ModuleRenderContext): void;
  resize?(size: CanvasSize): void;
  destroy?(): void;
}

import type { CanvasSize } from "@/engine/core/CanvasSize";
import type {
  EngineContext,
  EngineModule,
  ModuleRenderContext,
} from "@/engine/core/EngineModule";
import type { FrameInfo } from "@/engine/core/FrameLoop";
import { assertShaderCompiles } from "@/engine/graphics/shaders/ShaderCompiler";

export type ModulePhase =
  | "setup"
  | "resize"
  | "frame"
  | "teardown";

export class ModuleExecutionError extends Error {
  public constructor(
    public readonly moduleName: string,
    public readonly phase: ModulePhase,
    cause: unknown,
  ) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    super(`Module "${moduleName}" failed during ${phase}: ${detail}`, {
      cause,
    });
    this.name = "ModuleExecutionError";
  }
}

/**
 * Base class for research modules.
 *
 * The engine owns lifecycle wiring, context access, shader compilation,
 * diagnostics, and parameter-folder cleanup. Implementations keep resources
 * and CPU-side state as ordinary class fields, so no setup return values or
 * context objects need to be threaded between callbacks.
 */
export abstract class Module implements EngineModule {
  public abstract readonly name: string;

  private engineContext: EngineContext | undefined;
  private renderContext: ModuleRenderContext | undefined;
  private canvasSize: CanvasSize | undefined;
  private readonly shaderCache = new Map<
    string,
    Promise<GPUShaderModule>
  >();
  private initialized = false;
  private resized = false;

  public async initialize(context: EngineContext): Promise<void> {
    if (this.engineContext) {
      throw new Error(`Module "${this.name}" cannot be initialized twice.`);
    }

    this.engineContext = context;
    try {
      this.assertFrameImplemented();
      await this.hooks.setup?.call(this);
      this.initialized = true;
    } catch (error) {
      throw this.executionError("setup", error);
    }
  }

  public render(context: ModuleRenderContext): void {
    this.assertInitialized("frame");
    if (this.hooks.resizeResources && !this.resized) {
      throw this.executionError(
        "frame",
        new Error("resizeResources() has not completed."),
      );
    }

    this.renderContext = context;
    this.canvasSize = context.size;
    try {
      this.frameHook.call(this);
    } catch (error) {
      throw this.executionError("frame", error);
    } finally {
      this.renderContext = undefined;
    }
  }

  public resize(size: CanvasSize): void {
    this.assertInitialized("resize");
    this.canvasSize = size;
    try {
      this.hooks.resizeResources?.call(this);
      this.resized = true;
    } catch (error) {
      throw this.executionError("resize", error);
    }
  }

  public destroy(): void {
    if (!this.engineContext) {
      return;
    }

    try {
      try {
        this.hooks.teardown?.call(this);
      } catch (error) {
        throw this.executionError("teardown", error);
      }
    } finally {
      this.engineContext.parameters.remove(this.name);
      this.shaderCache.clear();
      this.renderContext = undefined;
      this.canvasSize = undefined;
      this.initialized = false;
      this.resized = false;
      this.engineContext = undefined;
    }
  }

  protected get context(): EngineContext {
    if (!this.engineContext) {
      throw new Error(`Module "${this.name}" has not been initialized.`);
    }
    return this.engineContext;
  }

  protected get gpu(): EngineContext["gpu"] {
    return this.context.gpu;
  }

  protected get device(): GPUDevice {
    return this.gpu.device;
  }

  protected get camera(): EngineContext["camera"] {
    return this.context.camera;
  }

  protected get cameraUniforms(): EngineContext["cameraUniforms"] {
    return this.context.cameraUniforms;
  }

  protected get input(): EngineContext["input"] {
    return this.context.input;
  }

  protected get parameters(): EngineContext["parameters"] {
    return this.context.parameters;
  }

  protected get stats(): EngineContext["stats"] {
    return this.context.stats;
  }

  protected compileShader(
    source: string,
    label: string,
  ): Promise<GPUShaderModule> {
    const cached = this.shaderCache.get(source);
    if (cached) {
      return cached;
    }

    const fullLabel = `${this.name} ${label} shader`;
    const compilation = (async (): Promise<GPUShaderModule> => {
      const shader = this.device.createShaderModule({
        label: fullLabel,
        code: source,
      });
      await assertShaderCompiles(shader, fullLabel);
      return shader;
    })();
    this.shaderCache.set(source, compilation);
    return compilation;
  }

  protected get commandEncoder(): GPUCommandEncoder {
    return this.currentRenderContext.commandEncoder;
  }

  protected get colorView(): GPUTextureView {
    return this.currentRenderContext.colorView;
  }

  protected get size(): CanvasSize {
    if (!this.canvasSize) {
      throw new Error(`Module "${this.name}" has no canvas size.`);
    }
    return this.canvasSize;
  }

  protected get frameInfo(): FrameInfo {
    return this.currentRenderContext.frame;
  }

  protected get time(): number {
    return this.frameInfo.time;
  }

  protected get deltaTime(): number {
    return this.frameInfo.deltaTime;
  }

  protected get frameIndex(): number {
    return this.frameInfo.frameIndex;
  }

  protected get frameContext(): ModuleRenderContext {
    return this.currentRenderContext;
  }

  private get hooks(): ModuleHooks {
    return this as unknown as ModuleHooks;
  }

  private get frameHook(): () => void {
    const frame = this.hooks.frame;
    if (!frame) {
      throw this.executionError(
        "frame",
        new Error("frame() is not implemented."),
      );
    }
    return frame;
  }

  private get currentRenderContext(): ModuleRenderContext {
    if (!this.renderContext) {
      throw new Error(
        `Module "${this.name}" accessed frame data outside frame().`,
      );
    }
    return this.renderContext;
  }

  private assertInitialized(phase: ModulePhase): void {
    if (!this.initialized) {
      throw this.executionError(
        phase,
        new Error("setup() has not completed."),
      );
    }
  }

  private assertFrameImplemented(): void {
    if (typeof this.hooks.frame !== "function") {
      throw new Error("frame() is not implemented.");
    }
  }

  private executionError(
    phase: ModulePhase,
    cause: unknown,
  ): ModuleExecutionError {
    return cause instanceof ModuleExecutionError
      ? cause
      : new ModuleExecutionError(this.name, phase, cause);
  }
}

interface ModuleHooks {
  setup?(): void | Promise<void>;
  frame?: () => void;
  resizeResources?(): void;
  teardown?(): void;
}

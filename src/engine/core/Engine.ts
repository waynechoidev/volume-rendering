import {
  calculateCanvasSize,
  canvasSizesMatch,
  type CanvasSize,
} from "@/engine/core/CanvasSize";
import type { EngineContext, EngineModule } from "@/engine/core/EngineModule";
import { FrameLoop, type FrameInfo } from "@/engine/core/FrameLoop";
import { GPUContext } from "@/engine/core/GPUContext";
import { CameraUniforms } from "@/engine/camera/CameraUniforms";
import { OrbitCameraController } from "@/engine/camera/OrbitCameraController";
import { PerspectiveCamera } from "@/engine/camera/PerspectiveCamera";
import { InputManager } from "@/engine/input/InputManager";
import { ShaderLibrary } from "@/engine/graphics/shaders/ShaderLibrary";
import { DebugUI } from "@/engine/ui/DebugUI";
import { Stats } from "@/engine/ui/Stats";

export interface EngineOptions {
  readonly maxPixelRatio?: number;
  readonly onError?: (error: Error) => void;
  readonly uiContainer?: HTMLElement;
}

export class Engine {
  public readonly gpu: GPUContext;
  public readonly camera: PerspectiveCamera;
  public readonly input: InputManager;

  private readonly modules: EngineModule[] = [];
  private readonly frameLoop: FrameLoop;
  private readonly maxPixelRatio: number;
  private readonly onError: (error: Error) => void;
  private readonly resizeObserver: ResizeObserver;
  private readonly abortController = new AbortController();
  private readonly cameraUniforms: CameraUniforms;
  private readonly shaders: ShaderLibrary;
  private readonly orbitController: OrbitCameraController;
  private readonly debugUI: DebugUI;
  private readonly stats: Stats;
  private readonly context: EngineContext;

  private size: CanvasSize | undefined;
  private resizeRequested = true;
  private destroyed = false;

  private constructor(
    gpu: GPUContext,
    {
      maxPixelRatio = 2,
      onError = console.error,
      uiContainer = document.body,
    }: EngineOptions,
  ) {
    this.gpu = gpu;
    this.camera = new PerspectiveCamera();
    this.input = new InputManager(gpu.canvas);
    this.cameraUniforms = new CameraUniforms(gpu.device);
    this.shaders = new ShaderLibrary(gpu.device);
    this.orbitController = new OrbitCameraController(this.camera, this.input);
    this.debugUI = new DebugUI(uiContainer);
    this.stats = new Stats(uiContainer, gpu.adapter);
    this.context = {
      gpu: this.gpu,
      shaders: this.shaders,
      camera: this.camera,
      cameraUniforms: this.cameraUniforms,
      input: this.input,
      parameters: this.debugUI.parameters,
      stats: this.stats,
    };
    this.maxPixelRatio = maxPixelRatio;
    this.onError = onError;
    this.frameLoop = new FrameLoop(this.renderFrame);
    this.resizeObserver = new ResizeObserver(this.requestResize);

    this.resizeObserver.observe(this.gpu.canvas);
    window.visualViewport?.addEventListener("resize", this.requestResize, {
      signal: this.abortController.signal,
    });
    window.addEventListener("orientationchange", this.requestResize, {
      signal: this.abortController.signal,
    });
    this.gpu.device.addEventListener(
      "uncapturederror",
      this.handleUncapturedError,
      { signal: this.abortController.signal },
    );

    void this.gpu.device.lost.then((info) => {
      if (this.destroyed || info.reason === "destroyed") {
        return;
      }

      this.fail(
        new Error(
          `WebGPU device lost (${info.reason || "unknown"}): ${info.message}`,
        ),
      );
    });

    const cameraFolder = this.debugUI.parameters.register("Camera");
    cameraFolder
      .add(this.camera, "fieldOfViewDegrees", 20, 100, 1)
      .name("Field of view")
      .onChange(() => this.camera.updateMatrices());
    cameraFolder.add(this.orbitController, "reset").name("Reset view");
  }

  public static async create(
    canvas: HTMLCanvasElement,
    options: EngineOptions = {},
  ): Promise<Engine> {
    return new Engine(await GPUContext.create(canvas), options);
  }

  public async addModule(module: EngineModule): Promise<void> {
    this.assertActive();

    if (this.modules.some(({ name }) => name === module.name)) {
      throw new Error(`An engine module named "${module.name}" already exists.`);
    }

    this.gpu.device.pushErrorScope("validation");

    let initializationError: unknown;
    try {
      await module.initialize(this.context);
    } catch (error) {
      initializationError = error;
    }

    const validationError = await this.gpu.device.popErrorScope();

    if (initializationError) {
      module.destroy?.();
      throw this.asError(
        initializationError,
        `Failed to initialize module "${module.name}".`,
      );
    }

    if (validationError) {
      module.destroy?.();
      throw new Error(
        `WebGPU validation failed while initializing module "${module.name}": ${validationError.message}`,
      );
    }

    this.modules.push(module);

    if (this.size) {
      module.resize?.(this.size);
    }
  }

  public removeModule(name: string): void {
    this.assertActive();
    const index = this.modules.findIndex((module) => module.name === name);
    if (index < 0) {
      return;
    }

    const [module] = this.modules.splice(index, 1);
    module?.destroy?.();
    this.debugUI.parameters.remove(name);
  }

  public resetCamera(): void {
    this.assertActive();
    this.orbitController.reset();
  }

  public start(): void {
    this.assertActive();

    if (this.frameLoop.running) {
      return;
    }

    if (!this.size) {
      this.updateCanvasSize();
    }

    this.frameLoop.start();
  }

  public stop(): void {
    this.frameLoop.stop();
  }

  public destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.stop();
    this.resizeObserver.disconnect();
    this.abortController.abort();

    for (let index = this.modules.length - 1; index >= 0; index -= 1) {
      this.modules[index]?.destroy?.();
    }

    this.modules.length = 0;
    this.cameraUniforms.destroy();
    this.input.destroy();
    this.stats.destroy();
    this.debugUI.destroy();
    this.gpu.destroy();
  }

  private readonly requestResize = (): void => {
    this.resizeRequested = true;
  };

  private readonly handleUncapturedError = (
    event: GPUUncapturedErrorEvent,
  ): void => {
    event.preventDefault();
    this.fail(new Error(`Uncaptured WebGPU error: ${event.error.message}`));
  };

  private readonly renderFrame = (frame: FrameInfo): void => {
    try {
      if (
        this.resizeRequested ||
        this.size?.pixelRatio !==
          Math.min(window.devicePixelRatio || 1, this.maxPixelRatio)
      ) {
        this.updateCanvasSize();
      }

      const size = this.size;
      if (!size) {
        return;
      }

      this.orbitController.update(frame);
      this.cameraUniforms.update(this.camera);

      const commandEncoder = this.gpu.device.createCommandEncoder({
        label: `Frame ${frame.frameIndex}`,
      });
      const colorView = this.gpu.getCurrentTextureView();

      for (const module of this.modules) {
        module.render({
          commandEncoder,
          colorView,
          size,
          frame,
        });
      }

      this.gpu.device.queue.submit([commandEncoder.finish()]);
      this.stats.update(frame, size);
      this.input.endFrame();
    } catch (error) {
      this.fail(this.asError(error, "The engine failed while rendering."));
    }
  };

  private updateCanvasSize(): void {
    this.resizeRequested = false;

    const bounds = this.gpu.canvas.getBoundingClientRect();
    const nextSize = calculateCanvasSize({
      cssWidth: bounds.width,
      cssHeight: bounds.height,
      devicePixelRatio: window.devicePixelRatio || 1,
      maxPixelRatio: this.maxPixelRatio,
      maxDimension: this.gpu.device.limits.maxTextureDimension2D,
    });

    if (this.size && canvasSizesMatch(this.size, nextSize)) {
      return;
    }

    this.size = nextSize;
    this.gpu.configure(nextSize);
    this.camera.setAspect(nextSize.width / nextSize.height);

    for (const module of this.modules) {
      module.resize?.(nextSize);
    }
  }

  private fail(error: Error): void {
    this.stop();
    this.stats.showError(error);
    this.onError(error);
  }

  private assertActive(): void {
    if (this.destroyed) {
      throw new Error("The engine has already been destroyed.");
    }
  }

  private asError(error: unknown, fallbackMessage: string): Error {
    return error instanceof Error ? error : new Error(fallbackMessage);
  }
}

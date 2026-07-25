import {
  calculateCanvasSize,
  canvasSizesMatch,
  type CanvasSize,
} from "./CanvasSize";
import type { EngineModule } from "./EngineModule";
import { FrameLoop, type FrameInfo } from "./FrameLoop";
import { GPUContext } from "./GPUContext";

export interface EngineOptions {
  readonly maxPixelRatio?: number;
  readonly onError?: (error: Error) => void;
}

export class Engine {
  public readonly gpu: GPUContext;

  private readonly modules: EngineModule[] = [];
  private readonly frameLoop: FrameLoop;
  private readonly maxPixelRatio: number;
  private readonly onError: (error: Error) => void;
  private readonly resizeObserver: ResizeObserver;
  private readonly abortController = new AbortController();

  private size: CanvasSize | undefined;
  private resizeRequested = true;
  private destroyed = false;

  private constructor(
    gpu: GPUContext,
    { maxPixelRatio = 2, onError = console.error }: EngineOptions,
  ) {
    this.gpu = gpu;
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
      await module.initialize(this.gpu);
    } catch (error) {
      initializationError = error;
    }

    const validationError = await this.gpu.device.popErrorScope();

    if (initializationError) {
      module.destroy();
      throw this.asError(
        initializationError,
        `Failed to initialize module "${module.name}".`,
      );
    }

    if (validationError) {
      module.destroy();
      throw new Error(
        `WebGPU validation failed while initializing module "${module.name}": ${validationError.message}`,
      );
    }

    this.modules.push(module);

    if (this.size) {
      module.resize(this.size);
    }
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
      this.modules[index]?.destroy();
    }

    this.modules.length = 0;
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

      for (const module of this.modules) {
        module.update(frame);
      }

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

    for (const module of this.modules) {
      module.resize(nextSize);
    }
  }

  private fail(error: Error): void {
    this.stop();
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

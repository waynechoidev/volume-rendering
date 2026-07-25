import type { CanvasSize } from "@/engine/core/CanvasSize";

export class WebGPUNotSupportedError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "WebGPUNotSupportedError";
  }
}

export class GPUContext {
  public readonly adapter: GPUAdapter;
  public readonly device: GPUDevice;
  public readonly canvas: HTMLCanvasElement;
  public readonly canvasContext: GPUCanvasContext;
  public readonly presentationFormat: GPUTextureFormat;

  private configured = false;

  private constructor(
    adapter: GPUAdapter,
    device: GPUDevice,
    canvas: HTMLCanvasElement,
    canvasContext: GPUCanvasContext,
    presentationFormat: GPUTextureFormat,
  ) {
    this.adapter = adapter;
    this.device = device;
    this.canvas = canvas;
    this.canvasContext = canvasContext;
    this.presentationFormat = presentationFormat;
  }

  public static async create(canvas: HTMLCanvasElement): Promise<GPUContext> {
    if (!window.isSecureContext) {
      throw new WebGPUNotSupportedError(
        "WebGPU requires a secure context. Use HTTPS or open the app on localhost.",
      );
    }

    if (!navigator.gpu) {
      throw new WebGPUNotSupportedError(
        "WebGPU is not available in this browser. Use a current WebGPU-capable browser and device.",
      );
    }

    const adapter = await navigator.gpu.requestAdapter();

    if (!adapter) {
      throw new WebGPUNotSupportedError(
        "No compatible WebGPU adapter was found on this device.",
      );
    }

    const device = await adapter.requestDevice();
    const canvasContext = canvas.getContext("webgpu");

    if (!canvasContext) {
      device.destroy();
      throw new WebGPUNotSupportedError(
        "The browser could not create a WebGPU canvas context.",
      );
    }

    return new GPUContext(
      adapter,
      device,
      canvas,
      canvasContext,
      navigator.gpu.getPreferredCanvasFormat(),
    );
  }

  public configure(size: CanvasSize): void {
    if (this.canvas.width !== size.width) {
      this.canvas.width = size.width;
    }

    if (this.canvas.height !== size.height) {
      this.canvas.height = size.height;
    }

    this.canvasContext.configure({
      device: this.device,
      format: this.presentationFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
      alphaMode: "opaque",
    });
    this.configured = true;
  }

  public getCurrentTextureView(): GPUTextureView {
    if (!this.configured) {
      throw new Error("GPUContext must be configured before rendering.");
    }

    return this.canvasContext.getCurrentTexture().createView();
  }

  public destroy(): void {
    if (this.configured) {
      this.canvasContext.unconfigure();
      this.configured = false;
    }

    this.device.destroy();
  }
}

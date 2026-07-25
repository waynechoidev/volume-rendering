import type { CanvasSize } from "../core/CanvasSize";
import type { FrameInfo } from "../core/FrameLoop";
import type { GPUTimingSupport } from "../graphics/timing/GPUTimingSupport";

const UPDATE_INTERVAL_SECONDS = 0.25;

export class Stats {
  private readonly element: HTMLElement;
  private readonly frameValue: HTMLElement;
  private readonly gpuValue: HTMLElement;
  private readonly canvasValue: HTMLElement;
  private elapsed = 0;
  private accumulatedFrames = 0;
  private accumulatedFrameTime = 0;

  public constructor(
    container: HTMLElement,
    adapter: GPUAdapter,
    timing: GPUTimingSupport,
  ) {
    this.element = document.createElement("aside");
    this.element.className = "engine-stats";
    this.element.setAttribute("aria-label", "Engine statistics");
    this.element.innerHTML = `
      <div><span>Frame</span><strong data-stat="frame">—</strong></div>
      <div><span>GPU</span><strong data-stat="gpu">—</strong></div>
      <div><span>Canvas</span><strong data-stat="canvas">—</strong></div>
    `;
    container.append(this.element);

    this.frameValue = this.requireStat("frame");
    this.gpuValue = this.requireStat("gpu");
    this.canvasValue = this.requireStat("canvas");

    const adapterDescription =
      adapter.info.description ||
      adapter.info.device ||
      adapter.info.architecture ||
      "WebGPU adapter";
    this.gpuValue.textContent = `${adapterDescription} · timing ${
      timing.supported ? "available" : "unavailable"
    }`;
  }

  public update(frame: FrameInfo, size: CanvasSize): void {
    this.elapsed += frame.deltaTime;
    this.accumulatedFrameTime += frame.deltaTime;
    this.accumulatedFrames += 1;

    if (this.elapsed < UPDATE_INTERVAL_SECONDS) {
      return;
    }

    const averageSeconds =
      this.accumulatedFrameTime / Math.max(1, this.accumulatedFrames);
    const milliseconds = averageSeconds * 1000;
    const fps = averageSeconds > 0 ? 1 / averageSeconds : 0;

    this.frameValue.textContent = `${fps.toFixed(0)} fps · ${milliseconds.toFixed(1)} ms`;
    this.canvasValue.textContent =
      `${size.width}×${size.height} · DPR ${size.pixelRatio.toFixed(2)}`;
    this.elapsed = 0;
    this.accumulatedFrameTime = 0;
    this.accumulatedFrames = 0;
  }

  public showError(error: Error): void {
    this.element.dataset.error = "true";
    this.frameValue.textContent = error.message;
  }

  public destroy(): void {
    this.element.remove();
  }

  private requireStat(name: string): HTMLElement {
    const element = this.element.querySelector<HTMLElement>(
      `[data-stat="${name}"]`,
    );
    if (!element) {
      throw new Error(`Missing engine statistic "${name}".`);
    }
    return element;
  }
}

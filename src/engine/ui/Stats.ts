import type { CanvasSize } from "@/engine/core/CanvasSize";
import type { FrameInfo } from "@/engine/core/FrameLoop";

const UPDATE_INTERVAL_SECONDS = 0.25;

export class Stats {
  private readonly element: HTMLElement;
  private readonly toggle: HTMLButtonElement;
  private readonly frameValue: HTMLElement;
  private readonly gpuValue: HTMLElement;
  private readonly canvasValue: HTMLElement;
  private elapsed = 0;
  private accumulatedFrames = 0;
  private accumulatedFrameTime = 0;

  public constructor(
    container: HTMLElement,
    adapter: GPUAdapter,
  ) {
    this.element = document.createElement("aside");
    this.element.className = "engine-stats";
    this.element.setAttribute("aria-label", "Engine statistics");
    this.element.innerHTML = `
      <button class="engine-stats__toggle" type="button"
        aria-label="Collapse statistics" aria-expanded="true">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div class="engine-stats__content">
        <div><span>Frame</span><strong data-stat="frame">—</strong></div>
        <div><span>GPU</span><strong data-stat="gpu">—</strong></div>
        <div><span>Canvas</span><strong data-stat="canvas">—</strong></div>
      </div>
    `;
    container.append(this.element);

    this.toggle = this.requireToggle();
    this.toggle.addEventListener("click", this.toggleCollapsed);
    this.frameValue = this.requireStat("frame");
    this.gpuValue = this.requireStat("gpu");
    this.canvasValue = this.requireStat("canvas");

    this.gpuValue.textContent = this.formatAdapterName(adapter.info);
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
    this.toggle.removeEventListener("click", this.toggleCollapsed);
    this.element.remove();
  }

  private readonly toggleCollapsed = (): void => {
    const collapsed = this.element.dataset.collapsed !== "true";
    this.element.dataset.collapsed = String(collapsed);
    this.toggle.setAttribute("aria-expanded", String(!collapsed));
    this.toggle.setAttribute(
      "aria-label",
      collapsed ? "Expand statistics" : "Collapse statistics",
    );
  };

  private requireToggle(): HTMLButtonElement {
    const toggle =
      this.element.querySelector<HTMLButtonElement>(".engine-stats__toggle");
    if (!toggle) {
      throw new Error("Missing engine statistics toggle.");
    }
    return toggle;
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

  private formatAdapterName(info: GPUAdapterInfo): string {
    const parts = [
      this.formatVendor(info.vendor),
      this.capitalize(info.architecture),
      info.device,
      info.description,
    ];
    const uniqueParts: string[] = [];

    for (const part of parts) {
      const normalized = part.trim();
      if (
        normalized &&
        !uniqueParts.some(
          (existing) => existing.toLowerCase() === normalized.toLowerCase(),
        )
      ) {
        uniqueParts.push(normalized);
      }
    }

    return uniqueParts.join(" ") || "WebGPU adapter";
  }

  private formatVendor(vendor: string): string {
    const knownVendors: Readonly<Record<string, string>> = {
      amd: "AMD",
      apple: "Apple",
      intel: "Intel",
      nvidia: "Nvidia",
      qualcomm: "Qualcomm",
    };
    const normalized = vendor.trim();
    return knownVendors[normalized.toLowerCase()] ?? normalized;
  }

  private capitalize(value: string): string {
    const normalized = value.trim();
    return normalized
      ? normalized[0]!.toUpperCase() + normalized.slice(1)
      : normalized;
  }
}

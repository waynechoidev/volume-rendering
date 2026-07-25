import { Engine } from "../core/Engine";
import type { EngineModule } from "../core/EngineModule";
import "./styles.css";

export interface EngineApplicationOptions {
  readonly modules: readonly EngineModule[];
  readonly label?: string;
  readonly maxPixelRatio?: number;
  readonly root?: HTMLElement;
}

export class EngineApplication {
  private readonly modules: readonly EngineModule[];
  private readonly maxPixelRatio: number;
  private readonly root: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly status: HTMLElement;
  private readonly statusTitle: HTMLElement;
  private readonly statusDetail: HTMLElement;

  private engine: Engine | undefined;
  private destroyed = false;

  public constructor({
    modules,
    label = "WebGPU Research Engine",
    maxPixelRatio = 2,
    root = EngineApplication.requireRoot(),
  }: EngineApplicationOptions) {
    this.modules = modules;
    this.maxPixelRatio = maxPixelRatio;
    this.root = root;
    this.root.classList.add("engine-application");
    this.root.setAttribute("aria-label", "WebGPU Research Engine");

    this.canvas = document.createElement("canvas");
    this.canvas.className = "engine-canvas";
    this.canvas.setAttribute("aria-label", "WebGPU rendering canvas");

    this.status = document.createElement("section");
    this.status.className = "status";
    this.status.setAttribute("role", "status");
    this.status.setAttribute("aria-live", "polite");

    const eyebrow = document.createElement("p");
    eyebrow.className = "status__eyebrow";
    eyebrow.textContent = "WebGPU Research Engine";

    this.statusTitle = document.createElement("h1");
    this.statusTitle.textContent = "Initializing GPU";
    this.statusDetail = document.createElement("p");
    this.statusDetail.textContent = "Preparing the rendering device…";
    this.status.append(eyebrow, this.statusTitle, this.statusDetail);

    const badge = document.createElement("div");
    badge.className = "badge";
    badge.setAttribute("aria-hidden", "true");
    badge.textContent = label;

    this.root.replaceChildren(this.canvas, this.status, badge);
  }

  public async start(): Promise<void> {
    if (this.destroyed) {
      throw new Error("Cannot start a destroyed EngineApplication.");
    }

    try {
      this.engine = await Engine.create(this.canvas, {
        maxPixelRatio: this.maxPixelRatio,
        onError: this.showError,
        uiContainer: this.root,
      });

      for (const module of this.modules) {
        await this.engine.addModule(module);
      }

      this.engine.start();
      document.documentElement.dataset.state = "ready";
      this.status.hidden = true;
    } catch (error) {
      this.showError(
        error instanceof Error
          ? error
          : new Error("The application failed to initialize."),
      );
    }
  }

  public destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.engine?.destroy();
    this.engine = undefined;
    document.documentElement.removeAttribute("data-state");
    this.root.replaceChildren();
  }

  private readonly showError = (error: Error): void => {
    console.error(error);
    document.documentElement.dataset.state = "error";
    this.status.hidden = false;
    this.status.classList.add("status--error");
    this.statusTitle.textContent = "Unable to start WebGPU";
    this.statusDetail.textContent = error.message;
  };

  private static requireRoot(): HTMLElement {
    const root = document.querySelector<HTMLElement>("#app");
    if (!root) {
      throw new Error('The application shell is missing "#app".');
    }
    return root;
  }
}

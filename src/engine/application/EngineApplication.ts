import { Engine } from "../core/Engine";
import type { EngineModule } from "../core/EngineModule";
import "./styles.css";

export interface EngineModuleConstructor {
  new (): EngineModule;
}

export interface ModuleCatalogEntry {
  readonly label: string;
  readonly module: EngineModuleConstructor;
}

export interface EngineApplicationOptions {
  readonly moduleCatalog: Readonly<Record<string, ModuleCatalogEntry>>;
  readonly initialModule: string;
  readonly maxPixelRatio?: number;
  readonly root?: HTMLElement;
}

export class EngineApplication {
  private readonly moduleCatalog: Readonly<
    Record<string, ModuleCatalogEntry>
  >;
  private readonly initialModule: string;
  private readonly maxPixelRatio: number;
  private readonly root: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly status: HTMLElement;
  private readonly statusTitle: HTMLElement;
  private readonly statusDetail: HTMLElement;
  private readonly moduleSelect: HTMLSelectElement;

  private engine: Engine | undefined;
  private activeModule: EngineModule | undefined;
  private destroyed = false;
  private switchVersion = 0;

  public constructor({
    moduleCatalog,
    initialModule,
    maxPixelRatio = 2,
    root = EngineApplication.requireRoot(),
  }: EngineApplicationOptions) {
    if (Object.keys(moduleCatalog).length === 0) {
      throw new Error("EngineApplication requires at least one module.");
    }
    if (!moduleCatalog[initialModule]) {
      throw new Error(`Unknown initial module "${initialModule}".`);
    }

    this.moduleCatalog = moduleCatalog;
    this.initialModule = initialModule;
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

    const modulePicker = document.createElement("label");
    modulePicker.className = "module-picker";
    const modulePickerLabel = document.createElement("span");
    modulePickerLabel.textContent = "Module";
    this.moduleSelect = document.createElement("select");
    this.moduleSelect.setAttribute("aria-label", "Active WebGPU module");

    for (const [id, entry] of Object.entries(moduleCatalog)) {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = entry.label;
      this.moduleSelect.append(option);
    }

    modulePicker.append(modulePickerLabel, this.moduleSelect);
    this.root.replaceChildren(this.canvas, this.status, modulePicker);
    this.moduleSelect.addEventListener("change", this.handleModuleChange);
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

      const requestedModule = new URL(window.location.href).searchParams.get(
        "module",
      );
      const initialModule =
        requestedModule && this.moduleCatalog[requestedModule]
          ? requestedModule
          : this.initialModule;
      this.moduleSelect.value = initialModule;
      await this.switchModule(initialModule);
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
    this.moduleSelect.removeEventListener("change", this.handleModuleChange);
    this.engine?.destroy();
    this.engine = undefined;
    this.activeModule = undefined;
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

  private readonly handleModuleChange = (): void => {
    void this.switchModule(this.moduleSelect.value);
  };

  private async switchModule(id: string): Promise<void> {
    const entry = this.moduleCatalog[id];
    const engine = this.engine;
    if (!entry || !engine || this.destroyed) {
      return;
    }

    const version = ++this.switchVersion;
    this.moduleSelect.disabled = true;
    engine.stop();

    try {
      const nextModule = new entry.module();
      if (version !== this.switchVersion || this.destroyed) {
        nextModule.destroy();
        return;
      }

      if (this.activeModule) {
        engine.removeModule(this.activeModule.name);
      }

      await engine.addModule(nextModule);
      this.activeModule = nextModule;
      this.updateModuleUrl(id);
      this.status.classList.remove("status--error");
      this.status.hidden = true;
      document.documentElement.dataset.state = "ready";
      engine.start();
    } catch (error) {
      this.showError(
        error instanceof Error
          ? error
          : new Error(`Failed to load module "${entry.label}".`),
      );
    } finally {
      if (version === this.switchVersion && !this.destroyed) {
        this.moduleSelect.disabled = false;
      }
    }
  }

  private updateModuleUrl(id: string): void {
    const url = new URL(window.location.href);
    url.searchParams.set("module", id);
    window.history.replaceState(null, "", url);
  }

  private static requireRoot(): HTMLElement {
    const root = document.querySelector<HTMLElement>("#app");
    if (!root) {
      throw new Error('The application shell is missing "#app".');
    }
    return root;
  }
}

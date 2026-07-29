import { Engine } from "@/engine/core/Engine";
import type { EngineModule } from "@/engine/core/EngineModule";
import { renderReadme } from "@/engine/application/render-readme";
import "katex/dist/katex.min.css";
import "@/engine/application/styles.css";

const COMMON_CONTROLS = `# Controls

## Desktop

- Drag: orbit around the scene.
- Mouse wheel: zoom in or out.
- Right-drag or Shift+drag: move the camera target.

## Touch

- One-finger drag: orbit around the scene.
- Pinch: zoom in or out.
- Two-finger drag: move the camera target.
`;

export type ReadmeLanguage = string;

export interface LocalizedReadme {
  readonly en: string;
  readonly [language: string]: string | undefined;
}

export type ReadmeSource = string | LocalizedReadme;

export interface EngineModuleConstructor {
  new (): EngineModule;
}

export interface ModuleCatalogEntry {
  readonly label: string;
  readonly module: EngineModuleConstructor;
  readonly readme?: ReadmeSource;
}

export interface EngineApplicationOptions {
  readonly modules: readonly ModuleCatalogEntry[];
  readonly maxPixelRatio?: number;
  readonly repositoryUrl?: string;
  readonly root?: HTMLElement;
}

export class EngineApplication {
  private readonly modules: readonly ModuleCatalogEntry[];
  private readonly maxPixelRatio: number;
  private readonly root: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly status: HTMLElement;
  private readonly statusTitle: HTMLElement;
  private readonly statusDetail: HTMLElement;
  private readonly modulePicker: HTMLElement;
  private readonly modulePickerToggle: HTMLButtonElement;
  private readonly moduleSelect: HTMLSelectElement;
  private readonly resetViewButton: HTMLButtonElement;
  private readonly controlsButton: HTMLButtonElement;
  private readonly readmeButton: HTMLButtonElement;
  private readonly readmeDialog: HTMLDialogElement;
  private readonly readmeLanguageButton: HTMLButtonElement;
  private readonly readmeCloseButton: HTMLButtonElement;
  private readonly readmeContent: HTMLElement;

  private engine: Engine | undefined;
  private activeModule: EngineModule | undefined;
  private activeReadme: ReadmeSource | undefined;
  private readmeLanguage: ReadmeLanguage;
  private destroyed = false;
  private switchVersion = 0;

  public constructor({
    modules,
    maxPixelRatio = 2,
    repositoryUrl,
    root = EngineApplication.requireRoot(),
  }: EngineApplicationOptions) {
    if (modules.length === 0) {
      throw new Error("EngineApplication requires at least one module.");
    }

    this.modules = modules;
    this.maxPixelRatio = maxPixelRatio;
    this.readmeLanguage =
      navigator.language.toLowerCase().split("-")[0] || "en";
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

    this.modulePicker = document.createElement("div");
    this.modulePicker.className = "module-picker";
    this.modulePickerToggle = document.createElement("button");
    this.modulePickerToggle.className = "module-picker__toggle";
    this.modulePickerToggle.type = "button";
    this.modulePickerToggle.setAttribute("aria-label", "Collapse module picker");
    this.modulePickerToggle.setAttribute("aria-expanded", "true");
    this.modulePickerToggle.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m14 6-6 6 6 6" />
      </svg>
    `;
    this.modulePickerToggle.addEventListener("click", this.toggleModulePicker);
    this.moduleSelect = document.createElement("select");
    this.moduleSelect.setAttribute("aria-label", "Active WebGPU module");

    for (const [index, entry] of modules.entries()) {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = entry.label;
      this.moduleSelect.append(option);
    }

    this.controlsButton = document.createElement("button");
    this.controlsButton.className = "application-button controls-button";
    this.controlsButton.type = "button";
    this.controlsButton.setAttribute("aria-label", "Open controls");
    this.controlsButton.title = "Controls";
    this.controlsButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h10m4 0h2M4 17h2m4 0h10M14 4v6M6 14v6" />
      </svg>
    `;
    this.controlsButton.addEventListener("click", this.openControls);

    this.resetViewButton = document.createElement("button");
    this.resetViewButton.className =
      "application-button icon-button reset-view-button";
    this.resetViewButton.type = "button";
    this.resetViewButton.setAttribute("aria-label", "Reset camera view");
    this.resetViewButton.title = "Reset view";
    this.resetViewButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="6" />
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      </svg>
    `;
    this.resetViewButton.addEventListener("click", this.resetView);

    this.readmeButton = document.createElement("button");
    this.readmeButton.className = "application-button";
    this.readmeButton.type = "button";
    this.readmeButton.textContent = "README";
    this.readmeButton.addEventListener("click", this.openReadme);

    const repositoryLink = repositoryUrl
      ? EngineApplication.createRepositoryLink(repositoryUrl)
      : undefined;

    this.readmeDialog = document.createElement("dialog");
    this.readmeDialog.className = "readme-dialog";
    this.readmeDialog.addEventListener(
      "click",
      this.handleReadmeBackdropClick,
    );
    const readmeBody = document.createElement("div");
    readmeBody.className = "readme-dialog__body";
    const readmeActions = document.createElement("div");
    readmeActions.className = "readme-dialog__actions";
    this.readmeLanguageButton = document.createElement("button");
    this.readmeLanguageButton.className = "readme-dialog__language";
    this.readmeLanguageButton.type = "button";
    this.readmeLanguageButton.addEventListener(
      "click",
      this.toggleReadmeLanguage,
    );
    this.readmeCloseButton = document.createElement("button");
    this.readmeCloseButton.className = "readme-dialog__close";
    this.readmeCloseButton.type = "button";
    this.readmeCloseButton.addEventListener("click", this.closeReadme);
    readmeActions.append(
      this.readmeLanguageButton,
      this.readmeCloseButton,
    );
    this.readmeContent = document.createElement("article");
    this.readmeContent.className = "readme-content";
    readmeBody.append(readmeActions, this.readmeContent);
    this.readmeDialog.append(readmeBody);

    this.modulePicker.append(this.moduleSelect, this.readmeButton);
    if (repositoryLink) {
      this.modulePicker.append(repositoryLink);
    }
    this.modulePicker.append(this.modulePickerToggle);
    this.root.replaceChildren(
      this.canvas,
      this.status,
      this.modulePicker,
      this.resetViewButton,
      this.controlsButton,
      this.readmeDialog,
    );

    if (modules.length > 1) {
      this.moduleSelect.addEventListener("change", this.handleModuleChange);
    } else {
      this.moduleSelect.classList.add("module-picker__single");
      this.moduleSelect.disabled = true;
    }
  }

  public async start(): Promise<void> {
    if (this.destroyed) {
      throw new Error("Cannot start a destroyed EngineApplication.");
    }

    try {
      this.removeLegacyModuleParameter();
      this.engine = await Engine.create(this.canvas, {
        maxPixelRatio: this.maxPixelRatio,
        onError: this.showError,
        uiContainer: this.root,
      });
      this.root.querySelector(".engine-stats")?.append(this.controlsButton);

      this.moduleSelect.selectedIndex = 0;
      await this.switchModule(0);
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
    this.modulePickerToggle.removeEventListener(
      "click",
      this.toggleModulePicker,
    );
    this.resetViewButton.removeEventListener("click", this.resetView);
    this.controlsButton.removeEventListener("click", this.openControls);
    this.readmeButton.removeEventListener("click", this.openReadme);
    this.readmeLanguageButton.removeEventListener(
      "click",
      this.toggleReadmeLanguage,
    );
    this.readmeCloseButton.removeEventListener("click", this.closeReadme);
    this.readmeDialog.removeEventListener(
      "click",
      this.handleReadmeBackdropClick,
    );
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
    void this.switchModule(this.moduleSelect.selectedIndex);
  };

  private readonly resetView = (): void => {
    this.engine?.resetCamera();
  };

  private readonly toggleModulePicker = (): void => {
    const collapsed = this.modulePicker.dataset.collapsed !== "true";
    this.modulePicker.dataset.collapsed = String(collapsed);
    this.modulePickerToggle.setAttribute("aria-expanded", String(!collapsed));
    this.modulePickerToggle.setAttribute(
      "aria-label",
      collapsed ? "Expand module picker" : "Collapse module picker",
    );
  };

  private readonly openControls = (): void => {
    this.activeReadme = COMMON_CONTROLS;
    this.renderActiveReadme();
    this.readmeDialog.showModal();
  };

  private readonly openReadme = (): void => {
    const entry = this.modules[this.moduleSelect.selectedIndex];
    if (!entry?.readme) return;
    this.activeReadme = entry.readme;
    this.renderActiveReadme();
    this.readmeDialog.showModal();
  };

  private readonly toggleReadmeLanguage = (): void => {
    const source = this.activeReadme;
    if (!source || typeof source === "string") {
      return;
    }

    const languages = EngineApplication.readmeLanguages(source);
    const currentLanguage = languages.includes(this.readmeLanguage)
      ? this.readmeLanguage
      : "en";
    const currentIndex = languages.indexOf(currentLanguage);
    this.readmeLanguage =
      languages[(currentIndex + 1) % languages.length] ?? "en";
    this.renderActiveReadme();
  };

  private renderActiveReadme(): void {
    const source = this.activeReadme;
    if (!source) {
      return;
    }

    const localized: LocalizedReadme =
      typeof source === "string" ? { en: source } : source;
    const languages = EngineApplication.readmeLanguages(localized);
    const language = languages.includes(this.readmeLanguage)
      ? this.readmeLanguage
      : "en";
    const currentIndex = languages.indexOf(language);
    const nextLanguage =
      languages[(currentIndex + 1) % languages.length] ?? "en";
    const markdown = localized[language] ?? localized.en;

    this.readmeLanguageButton.hidden = languages.length < 2;
    this.readmeLanguageButton.textContent = nextLanguage.toUpperCase();
    this.readmeLanguageButton.setAttribute(
      "aria-label",
      `View README in ${nextLanguage.toUpperCase()}`,
    );
    this.readmeCloseButton.textContent =
      language === "ko" ? "닫기" : "Close";
    this.readmeCloseButton.setAttribute(
      "aria-label",
      language === "ko" ? "README 닫기" : "Close README",
    );
    this.readmeContent.lang = language;
    this.readmeContent.innerHTML = renderReadme(markdown);
  }

  private readonly closeReadme = (): void => {
    this.readmeDialog.close();
  };

  private readonly handleReadmeBackdropClick = (event: MouseEvent): void => {
    if (event.target === this.readmeDialog) {
      this.readmeDialog.close();
    }
  };

  private async switchModule(index: number): Promise<void> {
    const entry = this.modules[index];
    const engine = this.engine;
    if (!entry || !engine || this.destroyed) {
      return;
    }
    this.readmeButton.hidden = !entry.readme;

    const version = ++this.switchVersion;
    this.moduleSelect.disabled = true;
    engine.stop();

    try {
      const nextModule = new entry.module();
      if (version !== this.switchVersion || this.destroyed) {
        nextModule.destroy?.();
        return;
      }

      if (this.activeModule) {
        engine.removeModule(this.activeModule.name);
      }

      engine.resetCamera();
      await engine.addModule(nextModule);
      this.activeModule = nextModule;
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
        this.moduleSelect.disabled = this.modules.length === 1;
      }
    }
  }

  private removeLegacyModuleParameter(): void {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("module")) {
      return;
    }

    url.searchParams.delete("module");
    window.history.replaceState(null, "", url);
  }

  private static requireRoot(): HTMLElement {
    const root = document.querySelector<HTMLElement>("#app");
    if (!root) {
      throw new Error('The application shell is missing "#app".');
    }
    return root;
  }

  private static createRepositoryLink(repositoryUrl: string): HTMLAnchorElement {
    const link = document.createElement("a");
    link.className = "application-button repository-link";
    link.href = repositoryUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", "Open project repository on GitHub");
    link.title = "GitHub repository";
    link.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.75a9.25 9.25 0 0 0-2.92 18.03c.46.08.63-.2.63-.45v-1.79c-2.57.56-3.11-1.09-3.11-1.09-.42-1.07-1.03-1.35-1.03-1.35-.84-.58.06-.57.06-.57.93.07 1.42.96 1.42.96.83 1.42 2.17 1.01 2.7.77.08-.6.32-1.01.59-1.24-2.05-.23-4.21-1.03-4.21-4.57 0-1.01.36-1.84.95-2.49-.1-.23-.41-1.18.09-2.45 0 0 .78-.25 2.54.95A8.8 8.8 0 0 1 12 7.1a8.8 8.8 0 0 1 2.31.31c1.76-1.2 2.54-.95 2.54-.95.5 1.27.19 2.22.09 2.45.59.65.95 1.48.95 2.49 0 3.55-2.16 4.33-4.22 4.56.33.29.63.85.63 1.72v2.65c0 .25.17.54.64.45A9.25 9.25 0 0 0 12 2.75Z" />
      </svg>
    `;
    return link;
  }

  private static readmeLanguages(readme: LocalizedReadme): string[] {
    const languages = Object.entries(readme)
      .filter((entry): entry is [string, string] => {
        return typeof entry[1] === "string" && entry[1].length > 0;
      })
      .map(([language]) => language);

    return languages.includes("en")
      ? ["en", ...languages.filter((language) => language !== "en")]
      : languages;
  }
}

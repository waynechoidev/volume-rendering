import { Engine } from "./core/Engine";
import { TriangleModule } from "./modules/triangle/TriangleModule";
import "./styles.css";

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (!element) {
    throw new Error(`The application shell is missing "${selector}".`);
  }

  return element;
}

const canvas = requireElement<HTMLCanvasElement>("#gpu-canvas");
const status = requireElement<HTMLElement>("#status");
const statusTitle = requireElement<HTMLElement>("#status-title");
const statusDetail = requireElement<HTMLElement>("#status-detail");

let engine: Engine | undefined;

function showError(error: Error): void {
  console.error(error);
  document.documentElement.dataset.state = "error";
  status.hidden = false;
  status.classList.add("status--error");
  statusTitle.textContent = "Unable to start WebGPU";
  statusDetail.textContent = error.message;
}

async function start(): Promise<void> {
  try {
    engine = await Engine.create(canvas, {
      maxPixelRatio: 2,
      onError: showError,
    });
    await engine.addModule(new TriangleModule());
    engine.start();

    document.documentElement.dataset.state = "ready";
    status.hidden = true;
  } catch (error) {
    showError(
      error instanceof Error
        ? error
        : new Error("The application failed to initialize."),
    );
  }
}

function shutdown(): void {
  engine?.destroy();
  engine = undefined;
}

window.addEventListener("pagehide", shutdown, { once: true });

if (import.meta.hot) {
  import.meta.hot.dispose(shutdown);
}

void start();

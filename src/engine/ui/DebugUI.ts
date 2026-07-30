import GUI from "lil-gui";

import { ParameterRegistry } from "@/engine/ui/ParameterRegistry";

export class DebugUI {
  public readonly parameters: ParameterRegistry;
  private readonly dialog: HTMLDialogElement;
  private readonly gui: GUI;
  private closeTimer: number | undefined;

  public constructor(
    container: HTMLElement,
    onResetAll: () => void,
    onClose: () => void,
  ) {
    this.dialog = document.createElement("dialog");
    this.dialog.className = "controls-dialog";
    const body = document.createElement("div");
    body.className = "controls-dialog__body";
    this.dialog.append(body);
    container.append(this.dialog);

    this.gui = new GUI({
      title: "Parameters",
      container: body,
      width: 384,
    });
    this.gui.domElement.classList.add("engine-gui");

    const emptyState = document.createElement("p");
    emptyState.className = "controls-dialog__empty";
    emptyState.textContent = "No adjustable parameters";
    body.append(emptyState);

    this.parameters = new ParameterRegistry(this.gui, (empty) => {
      this.dialog.dataset.empty = String(empty);
      emptyState.hidden = !empty;
    });

    const actions = document.createElement("div");
    actions.className = "controls-dialog__actions";
    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "controls-reset";
    reset.textContent = "Reset";
    reset.setAttribute("aria-label", "Reset all controls");
    reset.addEventListener("click", onResetAll);
    const collapse = document.createElement("button");
    collapse.type = "button";
    collapse.className = "controls-dialog__close";
    collapse.textContent = "Close";
    collapse.setAttribute("aria-label", "Close controls");
    collapse.addEventListener("click", () => {
      this.close();
    });
    actions.append(reset, collapse);
    body.prepend(actions);
    this.dialog.addEventListener("close", onClose);
    this.dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.close();
    });
    this.dialog.addEventListener("click", (event) => {
      if (event.target === this.dialog) {
        this.close();
      }
    });
  }

  public toggle(): boolean {
    if (this.dialog.open) {
      this.close();
      return false;
    }
    this.dialog.classList.remove("dialog--closing");
    this.dialog.show();
    return true;
  }

  public close(): void {
    if (
      !this.dialog.open ||
      this.dialog.classList.contains("dialog--closing")
    ) {
      return;
    }
    this.dialog.classList.add("dialog--closing");
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? 0
      : 280;
    this.closeTimer = window.setTimeout(() => {
      this.dialog.close();
      this.dialog.classList.remove("dialog--closing");
      this.closeTimer = undefined;
    }, duration);
  }

  public destroy(): void {
    if (this.closeTimer !== undefined) {
      window.clearTimeout(this.closeTimer);
    }
    this.parameters.destroy();
    this.dialog.remove();
  }
}

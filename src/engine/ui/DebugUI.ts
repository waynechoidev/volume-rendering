import GUI from "lil-gui";

import { ParameterRegistry } from "./ParameterRegistry";

export class DebugUI {
  public readonly parameters: ParameterRegistry;
  private readonly gui: GUI;

  public constructor(container: HTMLElement) {
    this.gui = new GUI({
      title: "Engine Controls",
      container,
      width: 300,
    });
    this.gui.domElement.classList.add("engine-gui");
    this.parameters = new ParameterRegistry(this.gui);

    if (window.matchMedia("(max-width: 700px)").matches) {
      this.gui.close();
    }
  }

  public destroy(): void {
    this.parameters.destroy();
  }
}

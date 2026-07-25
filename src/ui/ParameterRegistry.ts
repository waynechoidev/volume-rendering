import GUI, { type Controller } from "lil-gui";

export class ParameterFolder {
  public constructor(private readonly gui: GUI) {}

  public add<T>(
    target: T,
    property: keyof T,
    minimumOrOptions?: number | object | unknown[],
    maximum?: number,
    step?: number,
  ): Controller {
    return this.gui.add(
      target,
      property,
      minimumOrOptions,
      maximum,
      step,
    );
  }

  public close(): void {
    this.gui.close();
  }
}

export class ParameterRegistry {
  private readonly folders = new Map<string, GUI>();

  public constructor(private readonly gui: GUI) {}

  public register(name: string): ParameterFolder {
    if (this.folders.has(name)) {
      throw new Error(`A parameter folder named "${name}" already exists.`);
    }

    const folder = this.gui.addFolder(name);
    this.folders.set(name, folder);
    return new ParameterFolder(folder);
  }

  public remove(name: string): void {
    const folder = this.folders.get(name);
    if (!folder) {
      return;
    }

    folder.destroy();
    this.folders.delete(name);
  }

  public destroy(): void {
    this.folders.clear();
    this.gui.destroy();
  }
}

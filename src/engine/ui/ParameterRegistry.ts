import GUI, { type Controller } from "lil-gui";
import {
  ScalarTransferFunctionEditor,
  type ScalarTransferFunctionOptions,
} from "@/engine/ui/ScalarTransferFunctionEditor";
import {
  TransferFunction2DEditor,
  type TransferFunction2DOptions,
} from "@/engine/ui/TransferFunction2DEditor";

export class ParameterFolder {
  private readonly resetEntries: Array<{
    readonly controller: Controller;
    readonly read: () => unknown;
    value: unknown;
  }> = [];
  private readonly customResets: Array<() => void> = [];

  public constructor(private readonly gui: GUI) {}

  public add<T>(
    target: T,
    property: keyof T,
    minimumOrOptions?: number | object | unknown[],
    maximum?: number,
    step?: number,
  ): Controller {
    const controller = this.gui.add(
      target,
      property,
      minimumOrOptions,
      maximum,
      step,
    );
    const entry = {
      controller,
      read: (): unknown => target[property],
      value: target[property],
    };
    this.resetEntries.push(entry);
    return controller;
  }

  public captureDefaults(): void {
    for (const entry of this.resetEntries) {
      entry.value = entry.read();
    }
  }

  public resetAll(): void {
    for (const entry of this.resetEntries) {
      entry.controller.setValue(entry.value);
    }
    for (const reset of this.customResets) {
      reset();
    }
  }

  public addTransferFunction(
    options: ScalarTransferFunctionOptions,
  ): ScalarTransferFunctionEditor {
    const editor = new ScalarTransferFunctionEditor(options);
    const children = this.gui.domElement.querySelector<HTMLElement>(
      ":scope > .children",
    );
    (children ?? this.gui.domElement).append(editor.element);
    this.customResets.push(() => editor.reset());
    return editor;
  }

  public addTransferFunction2D(
    options: TransferFunction2DOptions,
  ): TransferFunction2DEditor {
    const editor = new TransferFunction2DEditor(options);
    const children = this.gui.domElement.querySelector<HTMLElement>(
      ":scope > .children",
    );
    (children ?? this.gui.domElement).append(editor.element);
    this.customResets.push(() => editor.reset());
    return editor;
  }

  public close(): void {
    this.gui.close();
  }
}

export class ParameterRegistry {
  private readonly folders = new Map<
    string,
    { readonly gui: GUI; readonly parameters: ParameterFolder }
  >();

  public constructor(
    private readonly gui: GUI,
    private readonly onEmptyChange: (empty: boolean) => void = () => {},
  ) {
    this.onEmptyChange(true);
  }

  public register(name: string): ParameterFolder {
    if (this.folders.has(name)) {
      throw new Error(`A parameter folder named "${name}" already exists.`);
    }

    const gui = this.gui.addFolder(name);
    const parameters = new ParameterFolder(gui);
    this.folders.set(name, { gui, parameters });
    this.onEmptyChange(false);
    return parameters;
  }

  public open(): void {
    this.gui.open();
  }

  public remove(name: string): void {
    const folder = this.folders.get(name);
    if (!folder) {
      return;
    }

    folder.gui.destroy();
    this.folders.delete(name);
    this.onEmptyChange(this.folders.size === 0);
  }

  public resetAll(): void {
    for (const { parameters } of this.folders.values()) {
      parameters.resetAll();
    }
  }

  public destroy(): void {
    this.folders.clear();
    this.gui.destroy();
  }
}

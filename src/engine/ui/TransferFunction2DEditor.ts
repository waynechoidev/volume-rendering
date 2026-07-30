export interface TransferRegion2D {
  readonly label: string;
  readonly color: string;
  intensityMinimum: number;
  intensityMaximum: number;
  gradientMinimum: number;
  gradientMaximum: number;
  opacity: number;
}

export interface TransferFunction2DOptions {
  readonly histogram: ArrayLike<number>;
  readonly histogramWidth: number;
  readonly histogramHeight: number;
  readonly intensityMaximum: number;
  readonly gradientMaximum: number;
  readonly regions: readonly TransferRegion2D[];
  readonly onChange: () => void;
}

export class TransferFunction2DEditor {
  public readonly element: HTMLElement;

  private readonly overlays: HTMLElement[] = [];
  private readonly valueLabels: HTMLElement[] = [];
  private readonly initialRegions: Array<{
    intensityMinimum: number;
    intensityMaximum: number;
    gradientMinimum: number;
    gradientMaximum: number;
    opacity: number;
  }>;

  public constructor(private readonly options: TransferFunction2DOptions) {
    this.initialRegions = options.regions.map(
      ({
        intensityMinimum,
        intensityMaximum,
        gradientMinimum,
        gradientMaximum,
        opacity,
      }) => ({
        intensityMinimum,
        intensityMaximum,
        gradientMinimum,
        gradientMaximum,
        opacity,
      }),
    );
    this.element = document.createElement("section");
    this.element.className = "transfer-editor transfer-editor--2d";
    this.element.setAttribute("aria-label", "Two-dimensional transfer function");
    this.element.append(this.createChart());

    for (const [index, region] of options.regions.entries()) {
      this.element.append(this.createRegionControls(region, index));
    }
    this.updateDisplay();
  }

  public updateDisplay(): void {
    for (const [index, region] of this.options.regions.entries()) {
      const overlay = this.overlays[index];
      if (overlay) {
        overlay.style.left =
          `${(region.intensityMinimum / this.options.intensityMaximum) * 100}%`;
        overlay.style.width =
          `${((region.intensityMaximum - region.intensityMinimum) /
            this.options.intensityMaximum) * 100}%`;
        overlay.style.bottom =
          `${(region.gradientMinimum / this.options.gradientMaximum) * 100}%`;
        overlay.style.height =
          `${((region.gradientMaximum - region.gradientMinimum) /
            this.options.gradientMaximum) * 100}%`;
        overlay.style.background = region.color;
        overlay.style.opacity =
          String(0.18 + Math.min(1, region.opacity / 4) * 0.42);
      }

      const values = this.valueLabels[index];
      if (values) {
        values.textContent =
          `I ${Math.round(region.intensityMinimum)}–` +
          `${Math.round(region.intensityMaximum)} · ` +
          `G ${Math.round(region.gradientMinimum)}–` +
          `${Math.round(region.gradientMaximum)} · ` +
          `${region.opacity.toFixed(2)}`;
      }

      const inputs = this.element.querySelectorAll<HTMLInputElement>(
        `[data-region="${index}"]`,
      );
      for (const input of inputs) {
        const key = input.dataset.value as keyof TransferRegion2D;
        const value = region[key];
        if (typeof value === "number") input.value = String(value);
      }
    }
  }

  public reset(): void {
    for (const [index, region] of this.options.regions.entries()) {
      const initial = this.initialRegions[index];
      if (!initial) continue;
      region.intensityMinimum = initial.intensityMinimum;
      region.intensityMaximum = initial.intensityMaximum;
      region.gradientMinimum = initial.gradientMinimum;
      region.gradientMaximum = initial.gradientMaximum;
      region.opacity = initial.opacity;
    }
    this.updateDisplay();
  }

  private createChart(): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "transfer-editor-2d__chart";
    const canvas = document.createElement("canvas");
    canvas.width = this.options.histogramWidth;
    canvas.height = this.options.histogramHeight;
    canvas.setAttribute(
      "aria-label",
      "Joint histogram: intensity horizontally and gradient magnitude vertically",
    );
    const context = canvas.getContext("2d");
    if (context) {
      const image = context.createImageData(canvas.width, canvas.height);
      const histogram = Array.from(this.options.histogram);
      const maximum = Math.max(1, ...histogram);
      const logMaximum = Math.log1p(maximum);
      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          const source = x + (canvas.height - 1 - y) * canvas.width;
          const brightness =
            Math.round((Math.log1p(histogram[source] ?? 0) / logMaximum) * 255);
          const destination = (x + y * canvas.width) * 4;
          image.data[destination] = brightness;
          image.data[destination + 1] = brightness;
          image.data[destination + 2] = brightness;
          image.data[destination + 3] = 255;
        }
      }
      context.putImageData(image, 0, 0);
    }
    wrapper.append(canvas);

    for (const region of this.options.regions) {
      const overlay = document.createElement("span");
      overlay.className = "transfer-editor-2d__region";
      overlay.title = region.label;
      wrapper.append(overlay);
      this.overlays.push(overlay);
    }

    const xAxis = document.createElement("span");
    xAxis.className = "transfer-editor-2d__axis transfer-editor-2d__axis--x";
    xAxis.textContent = "Intensity →";
    const yAxis = document.createElement("span");
    yAxis.className = "transfer-editor-2d__axis transfer-editor-2d__axis--y";
    yAxis.textContent = "Gradient →";
    wrapper.append(xAxis, yAxis);
    return wrapper;
  }

  private createRegionControls(
    region: TransferRegion2D,
    index: number,
  ): HTMLElement {
    const group = document.createElement("fieldset");
    group.className = "transfer-editor__group";
    const header = document.createElement("legend");
    header.className = "transfer-editor__legend";
    const identity = document.createElement("span");
    const swatch = document.createElement("span");
    swatch.className = "transfer-editor__swatch";
    swatch.style.background = region.color;
    identity.append(swatch, region.label);
    const values = document.createElement("span");
    values.className = "transfer-editor__values transfer-editor__values--2d";
    this.valueLabels.push(values);
    header.append(identity, values);
    group.append(header);

    group.append(
      this.createRange("I min", region, index, "intensityMinimum"),
      this.createRange("I max", region, index, "intensityMaximum"),
      this.createRange("G min", region, index, "gradientMinimum"),
      this.createRange("G max", region, index, "gradientMaximum"),
      this.createRange("Opacity", region, index, "opacity"),
    );
    return group;
  }

  private createRange(
    labelText: string,
    region: TransferRegion2D,
    index: number,
    key:
      | "intensityMinimum"
      | "intensityMaximum"
      | "gradientMinimum"
      | "gradientMaximum"
      | "opacity",
  ): HTMLLabelElement {
    const label = document.createElement("label");
    label.className = "transfer-editor__control";
    const text = document.createElement("span");
    text.textContent = labelText;
    const input = document.createElement("input");
    input.type = "range";
    input.dataset.region = String(index);
    input.dataset.value = key;
    input.min = "0";
    input.max = key.startsWith("intensity")
      ? String(this.options.intensityMaximum)
      : key.startsWith("gradient")
        ? String(this.options.gradientMaximum)
        : "4";
    input.step = key === "opacity" ? "0.01" : "1";
    input.value = String(region[key]);
    input.addEventListener("input", () => {
      region[key] = Number(input.value);
      if (region.intensityMinimum > region.intensityMaximum) {
        if (key === "intensityMinimum") {
          region.intensityMaximum = region.intensityMinimum;
        } else {
          region.intensityMinimum = region.intensityMaximum;
        }
      }
      if (region.gradientMinimum > region.gradientMaximum) {
        if (key === "gradientMinimum") {
          region.gradientMaximum = region.gradientMinimum;
        } else {
          region.gradientMinimum = region.gradientMaximum;
        }
      }
      this.updateDisplay();
      this.options.onChange();
    });
    label.append(text, input);
    return label;
  }
}

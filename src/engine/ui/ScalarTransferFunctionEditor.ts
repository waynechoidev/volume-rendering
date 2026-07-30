export interface ScalarTransferBand {
  readonly label: string;
  readonly color: string;
  minimum: number;
  maximum: number;
  opacity: number;
}

export interface ScalarTransferFunctionOptions {
  readonly histogram: ArrayLike<number>;
  readonly domainMinimum: number;
  readonly domainMaximum: number;
  readonly bands: readonly ScalarTransferBand[];
  readonly onChange: () => void;
}

export class ScalarTransferFunctionEditor {
  public readonly element: HTMLElement;

  private readonly bandRects: SVGRectElement[] = [];
  private readonly valueLabels: HTMLElement[] = [];
  private readonly initialBands: Array<{
    minimum: number;
    maximum: number;
    opacity: number;
  }>;

  public constructor(private readonly options: ScalarTransferFunctionOptions) {
    this.initialBands = options.bands.map(
      ({ minimum, maximum, opacity }) => ({ minimum, maximum, opacity }),
    );
    this.element = document.createElement("section");
    this.element.className = "transfer-editor";
    this.element.setAttribute("aria-label", "Scalar transfer function");

    const chart = this.createChart();
    this.element.append(chart);

    for (const [index, band] of options.bands.entries()) {
      this.element.append(this.createBandControls(band, index));
    }

    this.updateDisplay();
  }

  public updateDisplay(): void {
    const span =
      this.options.domainMaximum - this.options.domainMinimum;

    for (const [index, band] of this.options.bands.entries()) {
      const start =
        (band.minimum - this.options.domainMinimum) / span;
      const end =
        (band.maximum - this.options.domainMinimum) / span;
      const rect = this.bandRects[index];
      rect?.setAttribute("x", String(Math.max(0, start) * 256));
      rect?.setAttribute(
        "width",
        String(Math.max(0, Math.min(1, end) - Math.max(0, start)) * 256),
      );
      rect?.setAttribute(
        "opacity",
        String(0.12 + Math.min(1, band.opacity / 4) * 0.42),
      );

      const label = this.valueLabels[index];
      if (label) {
        label.textContent =
          `${Math.round(band.minimum)}–${Math.round(band.maximum)}` +
          ` · ${band.opacity.toFixed(2)}`;
      }

      const inputs = this.element.querySelectorAll<HTMLInputElement>(
        `[data-band="${index}"]`,
      );
      for (const input of inputs) {
        const key = input.dataset.value as
          | "minimum"
          | "maximum"
          | "opacity";
        input.value = String(band[key]);
      }
    }
  }

  public reset(): void {
    for (const [index, band] of this.options.bands.entries()) {
      const initial = this.initialBands[index];
      if (!initial) continue;
      band.minimum = initial.minimum;
      band.maximum = initial.maximum;
      band.opacity = initial.opacity;
    }
    this.updateDisplay();
  }

  private createChart(): SVGSVGElement {
    const namespace = "http://www.w3.org/2000/svg";
    const chart = document.createElementNS(namespace, "svg");
    chart.classList.add("transfer-editor__chart");
    chart.setAttribute("viewBox", "0 0 256 92");
    chart.setAttribute("role", "img");
    chart.setAttribute(
      "aria-label",
      `Voxel intensity histogram from ${this.options.domainMinimum} to ${this.options.domainMaximum}`,
    );

    const histogram = Array.from(this.options.histogram);
    const largest = Math.max(1, ...histogram);
    const logLargest = Math.log1p(largest);
    const points = histogram.map((count, index) => {
      const x =
        (index / Math.max(1, histogram.length - 1)) * 256;
      const y = 84 - (Math.log1p(count) / logLargest) * 74;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    const area = document.createElementNS(namespace, "path");
    area.classList.add("transfer-editor__histogram");
    area.setAttribute(
      "d",
      `M0,84 L${points.join(" L")} L256,84 Z`,
    );
    chart.append(area);

    for (const band of this.options.bands) {
      const rect = document.createElementNS(namespace, "rect");
      rect.classList.add("transfer-editor__band");
      rect.setAttribute("y", "6");
      rect.setAttribute("height", "78");
      rect.setAttribute("fill", band.color);
      chart.append(rect);
      this.bandRects.push(rect);
    }

    return chart;
  }

  private createBandControls(
    band: ScalarTransferBand,
    index: number,
  ): HTMLElement {
    const group = document.createElement("fieldset");
    group.className = "transfer-editor__group";
    const header = document.createElement("legend");
    header.className = "transfer-editor__legend";

    const identity = document.createElement("span");
    const color = document.createElement("span");
    color.className = "transfer-editor__swatch";
    color.style.background = band.color;
    identity.append(color, band.label);

    const values = document.createElement("span");
    values.className = "transfer-editor__values";
    this.valueLabels.push(values);
    header.append(identity, values);
    group.append(header);

    group.append(
      this.createRange("Min", band, index, "minimum"),
      this.createRange("Max", band, index, "maximum"),
      this.createRange("Opacity", band, index, "opacity"),
    );
    return group;
  }

  private createRange(
    labelText: string,
    band: ScalarTransferBand,
    index: number,
    key: "minimum" | "maximum" | "opacity",
  ): HTMLLabelElement {
    const label = document.createElement("label");
    label.className = "transfer-editor__control";
    const text = document.createElement("span");
    text.textContent = labelText;
    const input = document.createElement("input");
    input.type = "range";
    input.dataset.band = String(index);
    input.dataset.value = key;

    if (key === "opacity") {
      input.min = "0";
      input.max = "4";
      input.step = "0.01";
    } else {
      input.min = String(this.options.domainMinimum);
      input.max = String(this.options.domainMaximum);
      input.step = "1";
    }

    input.value = String(band[key]);
    input.addEventListener("input", () => {
      band[key] = Number(input.value);
      if (key === "minimum" && band.minimum > band.maximum) {
        band.maximum = band.minimum;
      } else if (key === "maximum" && band.maximum < band.minimum) {
        band.minimum = band.maximum;
      }
      this.updateDisplay();
      this.options.onChange();
    });
    label.append(text, input);
    return label;
  }
}

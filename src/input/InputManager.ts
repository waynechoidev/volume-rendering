import { KeyboardState } from "./KeyboardState";
import { PointerState } from "./PointerState";

interface PointerPosition {
  x: number;
  y: number;
}

export class InputManager {
  public readonly keyboard = new KeyboardState();
  public readonly pointer = new PointerState();

  private readonly abortController = new AbortController();
  private readonly pointers = new Map<number, PointerPosition>();
  private previousPinchDistance: number | undefined;

  public constructor(private readonly element: HTMLElement) {
    const options = { signal: this.abortController.signal };
    element.addEventListener("pointerdown", this.onPointerDown, options);
    element.addEventListener("pointermove", this.onPointerMove, options);
    element.addEventListener("pointerup", this.onPointerUp, options);
    element.addEventListener("pointercancel", this.onPointerUp, options);
    element.addEventListener("wheel", this.onWheel, {
      ...options,
      passive: false,
    });
    window.addEventListener("keydown", this.onKeyDown, options);
    window.addEventListener("keyup", this.onKeyUp, options);
    window.addEventListener("blur", this.onBlur, options);
  }

  public endFrame(): void {
    this.pointer.endFrame();
  }

  public destroy(): void {
    this.abortController.abort();
    this.pointers.clear();
    this.keyboard.clear();
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.element.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.updatePointerCount();
    this.previousPinchDistance = this.getPinchDistance();
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const previous = this.pointers.get(event.pointerId);
    if (!previous) {
      return;
    }

    if (this.pointers.size === 1) {
      this.pointer.deltaX += event.clientX - previous.x;
      this.pointer.deltaY += event.clientY - previous.y;
    }

    previous.x = event.clientX;
    previous.y = event.clientY;

    if (this.pointers.size >= 2) {
      const nextDistance = this.getPinchDistance();
      if (
        nextDistance !== undefined &&
        this.previousPinchDistance !== undefined
      ) {
        this.pointer.pinchDelta += nextDistance - this.previousPinchDistance;
      }
      this.previousPinchDistance = nextDistance;
    }
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    this.pointers.delete(event.pointerId);
    this.updatePointerCount();
    this.previousPinchDistance = this.getPinchDistance();
  };

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.pointer.wheelDelta += event.deltaY;
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    this.keyboard.set(event.code, true);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keyboard.set(event.code, false);
  };

  private readonly onBlur = (): void => {
    this.pointers.clear();
    this.updatePointerCount();
    this.keyboard.clear();
  };

  private updatePointerCount(): void {
    this.pointer.activePointerCount = this.pointers.size;
  }

  private getPinchDistance(): number | undefined {
    const positions = this.pointers.values();
    const first = positions.next().value;
    const second = positions.next().value;
    if (first === undefined || second === undefined) {
      return undefined;
    }

    return Math.hypot(second.x - first.x, second.y - first.y);
  }
}

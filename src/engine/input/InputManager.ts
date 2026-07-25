import { KeyboardState } from "@/engine/input/KeyboardState";
import { PointerState } from "@/engine/input/PointerState";

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
    element.addEventListener("contextmenu", this.onContextMenu, options);
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
      const deltaX = event.clientX - previous.x;
      const deltaY = event.clientY - previous.y;
      const panning =
        (event.buttons & 2) !== 0 ||
        this.keyboard.isPressed("ShiftLeft") ||
        this.keyboard.isPressed("ShiftRight");
      if (panning) {
        this.pointer.panDeltaX += deltaX;
        this.pointer.panDeltaY += deltaY;
      } else {
        this.pointer.deltaX += deltaX;
        this.pointer.deltaY += deltaY;
      }
    }

    const previousCentroid =
      this.pointers.size >= 2 ? this.getPointerCentroid() : undefined;
    previous.x = event.clientX;
    previous.y = event.clientY;

    if (this.pointers.size >= 2) {
      const nextCentroid = this.getPointerCentroid();
      if (previousCentroid && nextCentroid) {
        this.pointer.panDeltaX += nextCentroid.x - previousCentroid.x;
        this.pointer.panDeltaY += nextCentroid.y - previousCentroid.y;
      }
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

  private readonly onContextMenu = (event: Event): void => {
    event.preventDefault();
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

  private getPointerCentroid(): PointerPosition | undefined {
    const positions = [...this.pointers.values()];
    if (positions.length < 2) {
      return undefined;
    }

    return {
      x: (positions[0]!.x + positions[1]!.x) * 0.5,
      y: (positions[0]!.y + positions[1]!.y) * 0.5,
    };
  }
}

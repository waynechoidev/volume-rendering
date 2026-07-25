export class PointerState {
  public deltaX = 0;
  public deltaY = 0;
  public panDeltaX = 0;
  public panDeltaY = 0;
  public wheelDelta = 0;
  public pinchDelta = 0;
  public activePointerCount = 0;

  public endFrame(): void {
    this.deltaX = 0;
    this.deltaY = 0;
    this.panDeltaX = 0;
    this.panDeltaY = 0;
    this.wheelDelta = 0;
    this.pinchDelta = 0;
  }
}

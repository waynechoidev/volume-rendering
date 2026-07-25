export interface FrameInfo {
  readonly time: number;
  readonly deltaTime: number;
  readonly frameIndex: number;
}

export type FrameCallback = (frame: FrameInfo) => void;

const MAX_DELTA_SECONDS = 0.1;

export class FrameLoop {
  private animationFrameId: number | undefined;
  private frameIndex = 0;
  private lastTime: number | undefined;

  public constructor(private readonly callback: FrameCallback) {}

  public get running(): boolean {
    return this.animationFrameId !== undefined;
  }

  public start(): void {
    if (this.running) {
      return;
    }

    this.lastTime = undefined;
    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  public stop(): void {
    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }

    this.lastTime = undefined;
  }

  private readonly tick = (timestampMilliseconds: number): void => {
    if (this.animationFrameId === undefined) {
      return;
    }

    const time = timestampMilliseconds / 1000;
    const deltaTime =
      this.lastTime === undefined
        ? 0
        : Math.min(time - this.lastTime, MAX_DELTA_SECONDS);

    this.lastTime = time;
    this.animationFrameId = requestAnimationFrame(this.tick);
    this.callback({
      time,
      deltaTime,
      frameIndex: this.frameIndex,
    });
    this.frameIndex += 1;
  };
}

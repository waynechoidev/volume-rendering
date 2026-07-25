export class KeyboardState {
  private readonly pressedKeys = new Set<string>();

  public isPressed(code: string): boolean {
    return this.pressedKeys.has(code);
  }

  public set(code: string, pressed: boolean): void {
    if (pressed) {
      this.pressedKeys.add(code);
    } else {
      this.pressedKeys.delete(code);
    }
  }

  public clear(): void {
    this.pressedKeys.clear();
  }
}

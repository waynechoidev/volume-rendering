export interface CanvasSize {
  readonly width: number;
  readonly height: number;
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly pixelRatio: number;
}

export interface CanvasSizeOptions {
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly devicePixelRatio: number;
  readonly maxPixelRatio: number;
  readonly maxDimension: number;
}

export function calculateCanvasSize({
  cssWidth,
  cssHeight,
  devicePixelRatio,
  maxPixelRatio,
  maxDimension,
}: CanvasSizeOptions): CanvasSize {
  const safeCssWidth = Math.max(1, cssWidth);
  const safeCssHeight = Math.max(1, cssHeight);
  const safeMaxPixelRatio = Math.max(0.1, maxPixelRatio);
  const requestedPixelRatio = Math.max(0.1, devicePixelRatio);
  const limitedPixelRatio = Math.min(requestedPixelRatio, safeMaxPixelRatio);
  const dimensionScale = Math.min(
    1,
    maxDimension / (safeCssWidth * limitedPixelRatio),
    maxDimension / (safeCssHeight * limitedPixelRatio),
  );
  const pixelRatio = limitedPixelRatio * dimensionScale;

  return {
    width: Math.max(1, Math.round(safeCssWidth * pixelRatio)),
    height: Math.max(1, Math.round(safeCssHeight * pixelRatio)),
    cssWidth: safeCssWidth,
    cssHeight: safeCssHeight,
    pixelRatio,
  };
}

export function canvasSizesMatch(
  first: CanvasSize,
  second: CanvasSize,
): boolean {
  return (
    first.width === second.width &&
    first.height === second.height &&
    first.cssWidth === second.cssWidth &&
    first.cssHeight === second.cssHeight &&
    first.pixelRatio === second.pixelRatio
  );
}

# Triangle

This is the smallest rendering example in the engine. It validates WebGPU
initialization, shader compilation, render-pipeline creation, uniform binding,
command encoding, and presentation to the canvas.

## Rendering

The vertex shader generates three vertices from `vertex_index`, so this module
does not need a vertex buffer. A single draw call renders one triangle:

```ts
renderPass.draw(3);
```

The fragment shader interpolates the vertex colors across the triangle.

## Responsive sizing

The module uploads the ratios of the canvas dimensions to a small uniform
buffer. The shader applies those ratios so the triangle keeps its proportions
when the viewport changes between portrait and landscape orientations.

## Files

- `TriangleModule.ts`: pipeline, uniform buffer, resize handling, and lifecycle.
- `triangle.wgsl`: procedural vertices and fragment colors.


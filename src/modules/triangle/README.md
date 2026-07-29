# Triangle

This is the smallest rendering example in the engine. It validates WebGPU
initialization, shader compilation, render-pipeline creation, command encoding,
and presentation to the canvas.

## Rendering

The vertex shader generates three vertices from `vertex_index`, so this module
does not need a vertex buffer. A single draw call renders one triangle:

```ts
renderPass.draw(3);
```

The fragment shader interpolates the vertex colors across the triangle.

The positions are written directly in clip space. The example intentionally has
no uniform buffer or viewport correction so the rendering path stays minimal.

## Files

- `TriangleModule.ts`: vertex shader, fragment shader, and screen pass.
- `triangle.vertex.wgsl`: procedural triangle vertices.
- `triangle.fragment.wgsl`: interpolated fragment color output.

# Compute Circle

This example demonstrates a minimal compute-to-render pipeline.

## Pipeline

1. The compute shader writes an antialiased circle into a screen-sized
   `rgba8unorm` storage texture.
2. A fullscreen triangle runs the fragment shader.
3. The fragment shader loads the computed texture and presents it to the
   canvas.

The texture is recreated automatically when the viewport changes. The compute
dispatch uses 8 × 8 workgroups:

```ts
[
  Math.ceil(width / 8),
  Math.ceil(height / 8),
]
```

The compute shader corrects its horizontal coordinates by the texture aspect
ratio, so the signed-distance field remains circular on portrait and landscape
screens.

## Files

- `ComputeCircleModule.ts`: resources and compute-to-screen pass order.
- `compute-circle.compute.wgsl`: circle generation into a storage texture.
- `compute-circle.vertex.wgsl`: fullscreen triangle.
- `compute-circle.fragment.wgsl`: computed texture presentation.

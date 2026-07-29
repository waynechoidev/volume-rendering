# Engine Diagnostics

This example validates the reusable 3D rendering facilities supplied by the
engine. It draws a colored cube above a reference grid using the shared camera
uniform buffer.

## Rendering

The cube uses a triangle-list pipeline with back-face culling. The grid uses a
separate line-list pipeline. Both pipelines share the same shader, vertex
layout, camera bind group, and `depth24plus` depth attachment.

Each vertex stores:

```text
position: float32x3
color:    float32x3
```

The vertex shader transforms a world-space point with the camera
view-projection matrix:

\[
\mathbf{p}_{clip}=VP\,\mathbf{p}_{world}
\]

The depth texture is recreated when the drawing-buffer dimensions change.

## Parameters

- `Enabled`: enables or disables all diagnostic geometry.
- `Show cube`: controls the solid cube.
- `Show grid`: controls the reference grid.

## Files

- `EngineDiagnosticsModule.ts`: diagnostic pipelines, resources, controls, and runtime.
- `diagnostics.vertex.wgsl`: camera transformation.
- `diagnostics.fragment.wgsl`: vertex-color rendering.
- `../../engine/geometry/ColoredGeometry.ts`: reusable cube and grid generation.

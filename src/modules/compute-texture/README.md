# Compute Texture

This example demonstrates a compute-to-render workflow. A compute shader writes
an animated procedural image into a storage texture, then a render pass samples
that texture onto a fullscreen triangle.

## Compute pass

The output texture uses `rgba8unorm` and is recreated at the current
drawing-buffer size. Each compute invocation writes one texel. For an
\(8\times8\) workgroup, the dispatch dimensions are:

\[
N_x=\left\lceil\frac{W}{8}\right\rceil,\qquad
N_y=\left\lceil\frac{H}{8}\right\rceil
\]

Bounds checks in the shader discard invocations outside the texture.

## Render pass

The render shader generates a fullscreen triangle from `vertex_index` and reads
the compute output as a sampled texture. The texture stays on the GPU between
the two passes; no CPU readback is performed.

## Parameters

- `Pattern scale`: spatial frequency of the generated pattern.
- `Animation speed`: rate of time-dependent motion.
- `Contrast`: strength of the final pattern.

## Files

- `ComputeTextureModule.ts`: parameters, resources, and compute-to-screen pass order.
- `compute-texture.compute.wgsl`: procedural storage-texture generation.
- `../../engine/shaders/fullscreen.vertex.wgsl`: engine-cached fullscreen
  triangle shader.
- `compute-texture.fragment.wgsl`: computed texture presentation.
- `dispatch.ts`: workgroup dispatch calculation.
- `dispatch.test.ts`: dispatch-size validation.

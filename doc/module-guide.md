# Research Module Guide

Create an independent directory under `src/modules/<module-name>/`. Keep its
TypeScript integration, WGSL, pipelines, binding contracts, parameters, and
tests together.

## Minimal workflow

1. Implement the structural `EngineModule` contract from
   `src/engine/core/EngineModule.ts`.
2. Create shaders and long-lived pipelines in `initialize`.
3. Register module controls through `context.parameters`.
4. Create dimension-dependent textures in `resize`.
5. Upload parameters in `update`.
6. Encode passes with `ModuleRenderContext.commandEncoder` in `render`.
7. Destroy owned buffers and textures and remove UI registrations in `destroy`.
8. Add the module class to the explicit catalog in `src/main.ts`.

Catalog registration is intentional. Merely adding a folder does not expose a
module in the runtime picker:

```ts
"my-module": {
  label: "My Module",
  module: MyModule,
},
```

## TypeScript and WGSL contract

Keep the following values synchronized and locally understandable:

- group and binding indices
- structure member order, byte alignment, and padding
- buffer usage and binding types
- texture format, sample type, and storage access
- shader stage visibility
- workgroup size and dispatch calculation

Use a CPU-side test for dispatch, packing, geometry, or state calculations.
Shader compilation errors are surfaced by `assertShaderCompiles`.

## Responsive behavior

Use the physical dimensions passed to `resize`; do not read window dimensions
inside a module. Recreate only size-dependent resources. The engine applies its
DPR and maximum texture-size limits before calling the module.

Use shared input state. Do not attach mouse-only DOM listeners. Keep controls
usable at narrow widths and choose conservative particle counts, texture sizes,
and memory use for coarse-pointer mobile devices.

## Reference modules

- `triangle`: minimal render pipeline.
- `engine-diagnostics`: camera, input, parameters, and diagnostics.
- `gpu-particles`: storage-buffer compute followed by instanced rendering.
- `compute-texture`: storage-texture compute followed by fullscreen rendering.


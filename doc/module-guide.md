# Research Module Guide

## Imports

Use the `@/` alias for all files under `src/`. This applies to TypeScript,
module-local helpers, tests, WGSL source, and Markdown loaded with `?raw`.

```ts
import type { EngineModule } from "@/engine/core/EngineModule";
import fragmentSource from "@/modules/my-module/render.fragment.wgsl?raw";
```

Do not use relative `./` or `../` imports in source files.

## Imperative research modules

Implement `EngineModule` directly for every registered experiment. Build
native WebGPU pipelines, bind groups, and command passes in the module. The
engine provides the device, frame loop, canvas target, camera, input,
parameters, and error handling; it does not infer pass order or shader
bindings.

Keep each shader stage in a separate WGSL file with exactly one entry point
named `main`.

Create an independent directory under `src/modules/<module-name>/`. Keep its
TypeScript integration, WGSL, pipelines, binding contracts, parameters, and
tests together.

## Minimal workflow

1. Create a class that implements `EngineModule`.
2. Create shaders and long-lived pipelines in `initialize`.
3. Create buffers and textures with native WebGPU or focused engine helpers.
4. Upload dynamic values in `update`.
5. Replace dimension-dependent resources in `resize`.
6. Encode compute and render commands explicitly in `render`.
7. Implement `destroy` when the module owns buffers, textures, UI, or other
   explicit resources.
8. Add the returned module constructor to the explicit `modules` list in
   `src/main.ts`.

List registration is intentional. Merely adding a folder does not expose a
module in the runtime picker:

```ts
{
  label: "My Module",
  module: MyModule,
  readme: myModuleReadme,
},
```

The `readme` field is optional. When present, the application renders its
Markdown and LaTeX-style `\(...\)` / `\[...\]` formulas in the README overlay.

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

# Research Module Guide

## Imports

Use the `@/` alias for all files under `src/`. This applies to TypeScript,
module-local helpers, tests, WGSL source, and Markdown loaded with `?raw`.

```ts
import { Module } from "@/engine/modules/Module";
import fragmentSource from "@/modules/my-module/render.fragment.wgsl?raw";
```

Do not use relative `./` or `../` imports in source files.

## Imperative research modules

Define every registered experiment as a class extending `Module`. Keep GPU
objects as class fields, user controls as public fields, shader compilation and
one-time pipeline construction in `setup`, and CPU/GPU execution order in the
parameterless `frame`. Add `resizeResources` and `teardown` only when needed.

The engine provides the device, frame loop, canvas target, camera, input,
parameter registry, shader diagnostics, and lifecycle connection. Pass order
and shader bindings remain imperative.

Keep each shader stage in a separate WGSL file with exactly one entry point
named `main`.

Create an independent directory under `src/modules/<module-name>/`. Keep its
TypeScript integration, WGSL, pipelines, binding contracts, parameters, and
tests together.

## Minimal workflow

1. Create a class extending `Module`.
2. Import each stage's WGSL source.
3. Declare parameters and owned GPU objects as class fields.
4. Compile shaders with `await this.compileShader(source, label)` and create resources,
   pipelines, bind groups, and controls in `setup`.
5. Call CPU helpers, upload data, and encode GPU commands in `frame`.
6. Replace dimension-dependent resources in `resizeResources`.
7. Release owned buffers and textures in `teardown`.
8. Add the module class to the explicit `modules` list in
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
The parent `Module` caches shaders compiled through `this.compileShader()` and
surfaces their diagnostics.

## Responsive behavior

Use the physical dimensions passed to `resize`; do not read window dimensions
inside a module. Recreate only size-dependent resources. The engine applies its
DPR and maximum texture-size limits before calling the module.

Use shared input state. Do not attach mouse-only DOM listeners. Keep controls
usable at narrow widths and choose conservative particle counts, texture sizes,
and memory use for coarse-pointer mobile devices.

# Research Module Guide

## Imports

Use relative `./` imports for files colocated inside one module. This keeps the
module portable when its directory is renamed:

```ts
import { Module } from "@/engine/modules/Module";
import fragmentSource from "./render.fragment.wgsl?raw";
import { createInitialData } from "./initial-data";
```

Use the `@/` alias when crossing a source boundary, such as importing engine
APIs from a module or importing modules from `main.ts`. Do not use `../` to
reach into another module.

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
  readme: {
    en: myModuleReadme,
    ko: myModuleReadmeKo,
  },
},
```

The `readme` field is optional. A plain Markdown string remains supported for
single-language modules. A localized object accepts arbitrary language-code
keys and requires English as its fallback. This repository currently maintains
only Korean in addition to English:

```ts
import readmeEn from "@/modules/my-module/README.md?raw";
import readmeKo from "@/modules/my-module/README.ko.md?raw";

readme: { en: readmeEn, ko: readmeKo }
```

Additional languages follow the `README.<language>.md` convention and can be
registered with another key:

```ts
readme: { en: readmeEn, ko: readmeKo, ja: readmeJa }
```

When multiple languages are present, the README overlay displays the next
language code, such as `KO`, and cycles through the available documents. It
initially uses the browser's primary language when available, falls back to
English, and preserves the selection while switching modules. Write inline
math with `$...$` and display math with `$$...$$` in every language. These are
the only supported math delimiters; do not use legacy parenthesis or bracket
math delimiters.
Keep localized documents technically synchronized. Keep their main title in
English and write established graphics and API terminology in English.

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

Use `this.device` for WebGPU object creation and `this.presentationFormat` for
canvas render targets. Do not unpack `gpu` from the engine context. Request the
engine's compiled fullscreen vertex shader with
`await this.fullscreenVertexShader()` instead of importing its WGSL source.

## Responsive behavior

Use the physical dimensions passed to `resize`; do not read window dimensions
inside a module. Recreate only size-dependent resources. The engine applies its
DPR and maximum texture-size limits before calling the module.

Use shared input state. Do not attach mouse-only DOM listeners. Keep controls
usable at narrow widths and choose conservative particle counts, texture sizes,
and memory use for coarse-pointer mobile devices.

## Runtime parameters

Create parameter folders in `setup` and keep their backing objects as module
fields:

```ts
private readonly settings = {
  speed: 1,
  particleCount: 65_536,
  mode: "Orbit",
};

setup() {
  const folder = this.parameters.register(this.name);
  folder.add(this.settings, "speed", 0, 4, 0.01);
  folder.add(this.settings, "particleCount", 1_024, 262_144, 1_024);
  folder.add(this.settings, "mode", ["Orbit", "Flow"]);
}
```

Registration controls only UI exposure. The settings remain ordinary mutable
module state and may drive uniform uploads, dispatch sizes, resource rebuilds,
or CPU-side decisions. Keep resource rebuilds explicit in controller
`onChange`/`onFinishChange` callbacks rather than hiding them in the engine.

`Reset` restores all values captured by `folder.add` and resets the shared
camera to the active module's `initialCameraView`. Use
`folder.captureDefaults()` after applying a preset during setup when the
post-preset values, rather than the field initializers, should become the reset
target.

Do not register camera position or orientation as module parameters. Declare an
optional initial view instead:

```ts
readonly initialCameraView = {
  yaw: Math.PI / 12,
  pitch: Math.PI / 12,
  distance: 5,
  target: [0, 0, 0] as const,
};
```

Modules without adjustable values should not add placeholder controls. The
Controls dialog handles an empty registry and still exposes `Reset` for the
camera.

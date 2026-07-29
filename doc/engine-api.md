# Engine API

The engine exposes a deliberately small API to research modules. Application
composition imports modules; modules import only public engine types and
utilities.

## Module lifecycle

An `EngineModule` implements:

```ts
interface EngineModule {
  readonly name: string;
  initialize(context: EngineContext): void | Promise<void>;
  render(context: ModuleRenderContext): void;
  resize?(size: CanvasSize): void;
  destroy?(): void;
}
```

- `initialize` creates long-lived GPU resources and registers controls.
- `resize` creates or replaces resources whose dimensions depend on the canvas.
- `render` only encodes work into the supplied command encoder.
- `destroy` releases every resource and registration owned by the module.

The engine calls `resize` before the first rendered frame and whenever the
physical canvas size changes. A module must tolerate `destroy` after partial
initialization.

The `Module` base class validates lifecycle order. A module with
`resizeResources()` cannot enter `frame()` until resizing has completed.
Exceptions from setup, resize, frame, and teardown are wrapped in
`ModuleExecutionError` with the module name and failing phase. Modules should
not repeat initialization or resize guards around their pipelines, bind
groups, and size-dependent textures.

## EngineContext

`initialize` receives shared services:

- `gpu`: adapter, device, configured canvas context, and presentation format.
- `camera` and `cameraUniforms`: shared perspective camera state.
- `input`: unified pointer, touch, wheel, pinch, and keyboard state.
- `parameters`: folders and controls managed by the shared debug UI.
- `stats`: shared runtime diagnostics.

Modules must not create another device, frame loop, global input system, or debug
UI.

## Frame and render contexts

`FrameInfo` contains time in seconds, bounded delta time, and a monotonic frame
index. `ModuleRenderContext` contains the frame command encoder, current canvas
texture view, physical `CanvasSize`, and `FrameInfo`.

Encode compute passes before dependent render passes into the same supplied
encoder. The engine submits the completed command buffer.

## Graphics utilities

Reusable helpers live under `src/engine/graphics`:

- `GPUBufferResource` and `UniformBuffer`
- `TextureResource` and depth-texture creation
- shader compilation diagnostics
- bind-group creation

These utilities expose WebGPU objects rather than hiding binding layouts or
resource usage.

## Research modules

Each research project extends the engine `Module` base class:

```ts
class MyModule extends Module {
  readonly name = "My Module";

  private pipeline!: GPURenderPipeline;

  async setup() {
    const vertexShader = await this.compileShader(vertex, "vertex");
    const fragmentShader = await this.compileShader(fragment, "fragment");

    this.pipeline = await this.device.createRenderPipelineAsync({
      vertex: { module: vertexShader },
      fragment: { module: fragmentShader },
    });
  }

  frame() {
    const pass = this.commandEncoder.beginRenderPass({
      colorAttachments: [{ view: this.colorView /* ... */ }],
    });
    // Encode work.
  }

  resizeResources() { /* use this.size */ }
  teardown() { /* destroy owned resources */ }
}
```

`this.compileShader(source, label)` creates and validates a shader during `setup`,
caches repeated source usage, and reports compilation errors with the module
and shader labels. The base class also
provides `this.gpu`, `this.device`, `this.camera`, `this.cameraUniforms`,
`this.input`, `this.parameters`, and `this.stats`. During `frame`, it additionally
provides `this.commandEncoder`, `this.colorView`, `this.size`, `this.frameInfo`,
`this.time`, `this.deltaTime`, `this.frameIndex`, and the complete
`this.frameContext` for passing to internal helpers. GPU resources, runtime
parameters, and CPU-side state remain ordinary class fields; lifecycle methods
do not return or receive module state.

Bind groups, pass descriptors, command order, draw calls, dispatch calls, data
uploads, resource replacement, and algorithm state remain imperative and
visible in the module.

Reusable engine assets include the fullscreen vertex shader and colored cube
and grid geometry generators.

## Resource ownership

Resources stored by a module are owned by that module. Release buffers and
textures in `teardown`. Bind groups and pipelines do
not have explicit destruction methods and are released when references are
dropped.

On resize, create the replacement texture and bind groups first, then destroy
the previous texture. Do not recreate size-independent pipelines or uniform
buffers. Never allocate transient GPU resources in `frame`.

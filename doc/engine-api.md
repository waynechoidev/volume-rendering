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
  update(frame: FrameInfo): void;
  render(context: ModuleRenderContext): void;
  resize(size: CanvasSize): void;
  destroy(): void;
}
```

- `initialize` creates long-lived GPU resources and registers controls.
- `resize` creates or replaces resources whose dimensions depend on the canvas.
- `update` advances CPU state and uploads small parameter buffers.
- `render` only encodes work into the supplied command encoder.
- `destroy` releases every resource and registration owned by the module.

The engine calls `resize` before the first rendered frame and whenever the
physical canvas size changes. A module must tolerate `destroy` after partial
initialization.

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
- asynchronous render and compute pipeline creation
- shader compilation diagnostics
- bind-group creation

These utilities expose WebGPU objects rather than hiding binding layouts or
resource usage.

## Resource ownership

The object that creates a GPU buffer or texture owns it and destroys it. Bind
groups and pipelines do not have explicit destruction methods and are released
when references are dropped.

On resize, create the replacement texture and bind groups first, then destroy
the previous texture. Do not recreate size-independent pipelines or uniform
buffers. Never allocate transient GPU resources in `update` or `render`.


import { describe, expect, it, vi } from "vitest";

import type {
  EngineContext,
  ModuleRenderContext,
} from "@/engine/core/EngineModule";
import {
  Module,
  ModuleExecutionError,
} from "@/engine/modules/Module";

class TestModule extends Module {
  public readonly name = "Test";

  public setup(): void {}
  public frame(): void {}
}

class SizedModule extends TestModule {
  public resizeResources(): void {}
}

function createContext(): EngineContext {
  return {
    gpu: { device: {} },
    parameters: { remove: vi.fn() },
  } as unknown as EngineContext;
}

function createRenderContext(): ModuleRenderContext {
  return {
    commandEncoder: {},
    colorView: {},
    size: { width: 1, height: 1 },
    frame: { time: 0, deltaTime: 0, frameIndex: 0 },
  } as unknown as ModuleRenderContext;
}

describe("Module", () => {
  it("rejects a module without frame()", async () => {
    class MissingFrameModule extends Module {
      public readonly name = "Missing Frame";
    }

    await expect(
      new MissingFrameModule().initialize(createContext()),
    ).rejects.toThrow(
      'Module "Missing Frame" failed during setup: frame() is not implemented.',
    );
  });

  it("rejects rendering before a size-dependent module is resized", async () => {
    const module = new SizedModule();
    await module.initialize(createContext());

    expect(() => module.render(createRenderContext())).toThrow(
      ModuleExecutionError,
    );
  });

  it("adds the module and lifecycle phase to frame errors", async () => {
    class BrokenModule extends TestModule {
      public override frame(): void {
        throw new Error("broken");
      }
    }

    const module = new BrokenModule();
    await module.initialize(createContext());

    expect(() => module.render(createRenderContext())).toThrow(
      'Module "Test" failed during frame: broken',
    );
  });
});

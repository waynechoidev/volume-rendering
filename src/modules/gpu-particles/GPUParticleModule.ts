import type { CanvasSize } from "../../engine/core/CanvasSize";
import type {
  EngineContext,
  EngineModule,
  ModuleRenderContext,
} from "../../engine/core/EngineModule";
import type { FrameInfo } from "../../engine/core/FrameLoop";
import { ParticleRenderer } from "./ParticleRenderer";
import {
  ParticleSimulation,
  type ParticleSettings,
} from "./ParticleSimulation";

const DESKTOP_PARTICLE_COUNT = 131_072;
const MOBILE_PARTICLE_COUNT = 32_768;

export class GPUParticleModule implements EngineModule, ParticleSettings {
  public readonly name = "GPU Particles";

  public particleCount = window.matchMedia("(pointer: coarse)").matches
    ? MOBILE_PARTICLE_COUNT
    : DESKTOP_PARTICLE_COUNT;
  public gravity = -0.55;
  public speed = 1;
  public bounds = 6;
  public pointSize = 0.008;

  private simulation: ParticleSimulation | undefined;
  private renderer: ParticleRenderer | undefined;
  private parameters: EngineContext["parameters"] | undefined;
  private resourcesDirty = false;
  private latestFrame: FrameInfo | undefined;
  private size: CanvasSize | undefined;

  public async initialize(context: EngineContext): Promise<void> {
    const { gpu, cameraUniforms, parameters } = context;
    this.parameters = parameters;
    this.simulation = await ParticleSimulation.create(gpu.device);
    this.renderer = await ParticleRenderer.create(
      gpu.device,
      gpu.presentationFormat,
      cameraUniforms.resource.buffer,
      this.simulation.parameterBuffer.buffer,
    );
    this.recreateParticleResources();

    const folder = parameters.register(this.name);
    folder
      .add(
        this,
        "particleCount",
        [16_384, 32_768, 65_536, 131_072, 262_144],
      )
      .name("Particle count")
      .onFinishChange(() => {
        this.resourcesDirty = true;
      });
    folder.add(this, "gravity", -3, 1, 0.05).name("Gravity");
    folder.add(this, "speed", 0, 3, 0.05).name("Simulation speed");
    folder.add(this, "bounds", 2, 12, 0.25).name("Bounds");
    folder.add(this, "pointSize", 0.002, 0.025, 0.001).name("Point size");
    folder.add(this, "resetParticles").name("Reset particles");

    if (window.matchMedia("(max-width: 700px)").matches) {
      folder.close();
    }
  }

  public update(frame: FrameInfo): void {
    if (this.resourcesDirty) {
      this.recreateParticleResources();
      this.resourcesDirty = false;
    }

    this.latestFrame = frame;
    this.simulation?.updateParameters(frame, this);
  }

  public render(context: ModuleRenderContext): void {
    if (!this.simulation || !this.renderer || !this.latestFrame) {
      throw new Error("GPU Particle module rendered before initialization.");
    }

    const outputBufferIndex = this.simulation.encode(context.commandEncoder);
    this.renderer.render(context, outputBufferIndex);
  }

  public resize(size: CanvasSize): void {
    this.size = size;
    this.simulation?.setAspectScale(size.height / size.width);
    this.renderer?.resize(size);
  }

  public readonly resetParticles = (): void => {
    this.resourcesDirty = true;
  };

  public destroy(): void {
    this.parameters?.remove(this.name);
    this.renderer?.destroy();
    this.simulation?.destroy();
    this.renderer = undefined;
    this.simulation = undefined;
    this.parameters = undefined;
    this.latestFrame = undefined;
    this.size = undefined;
  }

  private recreateParticleResources(): void {
    if (!this.simulation || !this.renderer) {
      return;
    }

    this.simulation.recreateParticles(this.particleCount);
    this.renderer.setParticleBuffers(
      this.simulation.getBuffers(),
      this.particleCount,
    );

    if (this.size) {
      this.simulation.setAspectScale(this.size.height / this.size.width);
    }
  }
}

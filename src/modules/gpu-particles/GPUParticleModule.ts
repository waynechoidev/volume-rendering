import { Module } from "@/engine/modules/Module";
import { ParticleRenderer } from "@/modules/gpu-particles/ParticleRenderer";
import {
  ParticleSimulation,
  type ParticleSettings,
} from "@/modules/gpu-particles/ParticleSimulation";
import computeShaderSource from "@/modules/gpu-particles/particle.compute.wgsl?raw";
import fragmentShaderSource from "@/modules/gpu-particles/particle.fragment.wgsl?raw";
import vertexShaderSource from "@/modules/gpu-particles/particle.vertex.wgsl?raw";

const DESKTOP_PARTICLE_COUNT = 131_072;
const MOBILE_PARTICLE_COUNT = 32_768;

export class GPUParticleModule
  extends Module
  implements ParticleSettings
{
  public readonly name = "GPU Particles";
  public particleCount = window.matchMedia("(pointer: coarse)").matches
    ? MOBILE_PARTICLE_COUNT
    : DESKTOP_PARTICLE_COUNT;
  public gravity = 8.5;
  public speed = 1;
  public bounds = 8;
  public pointSize = 0.004;

  private simulation!: ParticleSimulation;
  private renderer!: ParticleRenderer;
  private resourcesDirty = true;

  public readonly resetParticles = (): void => {
    this.resourcesDirty = true;
  };

  public async setup(): Promise<void> {
    const compute = await this.compileShader(computeShaderSource, "compute");
    const vertex = await this.compileShader(vertexShaderSource, "vertex");
    const fragment = await this.compileShader(fragmentShaderSource, "fragment");

    this.simulation = await ParticleSimulation.create(
      this.device,
      compute,
    );
    this.renderer = await ParticleRenderer.create(
      this.device,
      this.presentationFormat,
      this.cameraUniforms.resource.buffer,
      this.simulation.parameterBuffer.buffer,
      vertex,
      fragment,
    );

    const folder = this.parameters.register(this.name);
    folder
      .add(
        this,
        "particleCount",
        [16_384, 32_768, 65_536, 131_072, 262_144],
      )
      .name("Particle count")
      .onFinishChange(this.resetParticles);
    folder.add(this, "gravity", 2, 20, 0.25).name("Black hole mass");
    folder.add(this, "speed", 0, 3, 0.05).name("Simulation speed");
    folder.add(this, "bounds", 2, 12, 0.25).name("Bounds");
    folder.add(this, "pointSize", 0.002, 0.025, 0.001).name("Point size");
    folder.add(this, "resetParticles").name("Reset particles");
    if (window.matchMedia("(max-width: 700px)").matches) folder.close();
  }

  public resizeResources(): void {
    this.simulation.setAspectScale(this.size.height / this.size.width);
    this.renderer.resize(this.size);
  }

  public frame(): void {
    if (this.resourcesDirty) {
      this.simulation.recreateParticles(this.particleCount);
      this.renderer.setParticleBuffers(
        this.simulation.getBuffers(),
        this.particleCount,
      );
      this.simulation.setAspectScale(this.size.height / this.size.width);
      this.resourcesDirty = false;
    }

    this.simulation.updateParameters(this.frameInfo, this);
    const outputBufferIndex = this.simulation.encode(this.commandEncoder);
    this.renderer.render(this.frameContext, outputBufferIndex);
  }

  public teardown(): void {
    this.renderer?.destroy();
    this.simulation?.destroy();
  }
}

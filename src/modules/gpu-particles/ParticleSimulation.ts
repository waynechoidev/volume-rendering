import type { FrameInfo } from "@/engine/core/FrameLoop";
import { createBindGroup } from "@/engine/graphics/bind-groups/BindGroupFactory";
import { GPUBufferResource } from "@/engine/graphics/buffers/GPUBufferResource";
import { UniformBuffer } from "@/engine/graphics/buffers/UniformBuffer";
import {
  createInitialParticles,
  PARTICLE_STRIDE,
} from "@/modules/gpu-particles/particle-data";

const WORKGROUP_SIZE = 256;
const PARAMETER_BYTES = 32;

export interface ParticleSettings {
  particleCount: number;
  gravity: number;
  speed: number;
  bounds: number;
  pointSize: number;
}

export class ParticleSimulation {
  public readonly parameterBuffer: UniformBuffer;

  private readonly parameterStorage = new ArrayBuffer(PARAMETER_BYTES);
  private readonly parameterFloats = new Float32Array(this.parameterStorage);
  private readonly parameterIntegers = new Uint32Array(this.parameterStorage);
  private readonly bindGroupLayout: GPUBindGroupLayout;
  private readonly pipeline: GPUComputePipeline;

  private particleBuffers:
    | readonly [GPUBufferResource, GPUBufferResource]
    | undefined;
  private bindGroups: readonly [GPUBindGroup, GPUBindGroup] | undefined;
  private activeBufferIndex = 0;
  private particleCount = 0;
  private aspectScale = 1;

  private constructor(
    private readonly device: GPUDevice,
    bindGroupLayout: GPUBindGroupLayout,
    pipeline: GPUComputePipeline,
  ) {
    this.bindGroupLayout = bindGroupLayout;
    this.pipeline = pipeline;
    this.parameterBuffer = new UniformBuffer(
      device,
      "Particle simulation parameters",
      PARAMETER_BYTES,
    );
  }

  public static async create(
    device: GPUDevice,
    shaderModule: GPUShaderModule,
  ): Promise<ParticleSimulation> {
    const bindGroupLayout = device.createBindGroupLayout({
      label: "Particle simulation bind group layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" },
        },
      ],
    });
    const pipeline = await device.createComputePipelineAsync({
      label: "Particle simulation pipeline",
      layout: device.createPipelineLayout({
        label: "Particle simulation pipeline layout",
        bindGroupLayouts: [bindGroupLayout],
      }),
      compute: {
        module: shaderModule,
        entryPoint: "main",
      },
    });

    return new ParticleSimulation(device, bindGroupLayout, pipeline);
  }

  public recreateParticles(count: number): void {
    const initialData = createInitialParticles(count);
    const size = count * PARTICLE_STRIDE;
    const usage =
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.COPY_SRC;
    const first = new GPUBufferResource(this.device, {
      label: "Particle state A",
      size,
      usage,
      initialData,
    });
    const second = new GPUBufferResource(this.device, {
      label: "Particle state B",
      size,
      usage,
      initialData,
    });

    this.destroyParticleBuffers();
    this.particleBuffers = [first, second];
    this.bindGroups = [
      this.createSimulationBindGroup(first.buffer, second.buffer, "A to B"),
      this.createSimulationBindGroup(second.buffer, first.buffer, "B to A"),
    ];
    this.activeBufferIndex = 0;
    this.particleCount = count;
  }

  public setAspectScale(aspectScale: number): void {
    this.aspectScale = aspectScale;
  }

  public updateParameters(
    frame: FrameInfo,
    settings: ParticleSettings,
  ): void {
    this.parameterFloats[0] = frame.deltaTime;
    this.parameterFloats[1] = settings.gravity;
    this.parameterFloats[2] = settings.speed;
    this.parameterFloats[3] = frame.time;
    this.parameterIntegers[4] = this.particleCount;
    this.parameterFloats[5] = settings.bounds;
    this.parameterFloats[6] = settings.pointSize;
    this.parameterFloats[7] = this.aspectScale;
    this.parameterBuffer.write(this.parameterFloats);
  }

  public encode(commandEncoder: GPUCommandEncoder): number {
    if (!this.bindGroups) {
      throw new Error("Particle buffers have not been created.");
    }

    const computePass = commandEncoder.beginComputePass({
      label: "Particle simulation pass",
    });
    computePass.setPipeline(this.pipeline);
    computePass.setBindGroup(0, this.bindGroups[this.activeBufferIndex]);
    computePass.dispatchWorkgroups(
      Math.ceil(this.particleCount / WORKGROUP_SIZE),
    );
    computePass.end();

    this.activeBufferIndex = this.activeBufferIndex === 0 ? 1 : 0;
    return this.activeBufferIndex;
  }

  public getBuffers(): readonly [GPUBuffer, GPUBuffer] {
    if (!this.particleBuffers) {
      throw new Error("Particle buffers have not been created.");
    }
    return [
      this.particleBuffers[0].buffer,
      this.particleBuffers[1].buffer,
    ];
  }

  public destroy(): void {
    this.destroyParticleBuffers();
    this.parameterBuffer.destroy();
  }

  private createSimulationBindGroup(
    input: GPUBuffer,
    output: GPUBuffer,
    direction: string,
  ): GPUBindGroup {
    return createBindGroup(
      this.device,
      `Particle simulation ${direction}`,
      this.bindGroupLayout,
      [
        { binding: 0, resource: { buffer: input } },
        { binding: 1, resource: { buffer: output } },
        { binding: 2, resource: { buffer: this.parameterBuffer.buffer } },
      ],
    );
  }

  private destroyParticleBuffers(): void {
    this.particleBuffers?.[0].destroy();
    this.particleBuffers?.[1].destroy();
    this.particleBuffers = undefined;
    this.bindGroups = undefined;
  }
}

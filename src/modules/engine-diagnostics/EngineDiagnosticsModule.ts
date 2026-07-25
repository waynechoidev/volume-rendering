import type { CanvasSize } from "../../engine/core/CanvasSize";
import type {
  EngineContext,
  EngineModule,
  ModuleRenderContext,
} from "../../engine/core/EngineModule";
import type { FrameInfo } from "../../engine/core/FrameLoop";
import { createBindGroup } from "../../engine/graphics/bind-groups/BindGroupFactory";
import { GPUBufferResource } from "../../engine/graphics/buffers/GPUBufferResource";
import {
  assertShaderCompiles,
  createRenderPipeline,
} from "../../engine/graphics/pipelines/PipelineFactory";
import {
  createDepthTexture,
  type TextureResource,
} from "../../engine/graphics/textures/TextureResource";
import shaderSource from "./diagnostics.wgsl?raw";
import {
  createCubeVertices,
  createGridVertices,
  getVertexCount,
} from "./geometry";

const VERTEX_STRIDE = 6 * Float32Array.BYTES_PER_ELEMENT;
const DEPTH_FORMAT: GPUTextureFormat = "depth24plus";

export class EngineDiagnosticsModule implements EngineModule {
  public readonly name = "Engine Diagnostics";

  public enabled = true;
  public showCube = true;
  public showGrid = true;

  private device: GPUDevice | undefined;
  private cubePipeline: GPURenderPipeline | undefined;
  private gridPipeline: GPURenderPipeline | undefined;
  private bindGroup: GPUBindGroup | undefined;
  private cubeBuffer: GPUBufferResource | undefined;
  private gridBuffer: GPUBufferResource | undefined;
  private depthTexture: TextureResource | undefined;
  private cubeVertexCount = 0;
  private gridVertexCount = 0;
  private parameters: EngineContext["parameters"] | undefined;

  public async initialize(context: EngineContext): Promise<void> {
    const { gpu, cameraUniforms, parameters } = context;
    this.device = gpu.device;
    this.parameters = parameters;

    const shaderModule = gpu.device.createShaderModule({
      label: "Engine diagnostics shader",
      code: shaderSource,
    });
    await assertShaderCompiles(shaderModule, "Engine diagnostics shader");

    const vertexBuffers: GPUVertexBufferLayout[] = [
      {
        arrayStride: VERTEX_STRIDE,
        attributes: [
          { shaderLocation: 0, offset: 0, format: "float32x3" },
          {
            shaderLocation: 1,
            offset: 3 * Float32Array.BYTES_PER_ELEMENT,
            format: "float32x3",
          },
        ],
      },
    ];
    const cameraBindGroupLayout = gpu.device.createBindGroupLayout({
      label: "Diagnostics camera bind group layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "uniform" },
        },
      ],
    });
    const pipelineLayout = gpu.device.createPipelineLayout({
      label: "Diagnostics pipeline layout",
      bindGroupLayouts: [cameraBindGroupLayout],
    });
    const fragment: GPUFragmentState = {
      module: shaderModule,
      entryPoint: "fragment_main",
      targets: [{ format: gpu.presentationFormat }],
    };
    const depthStencil: GPUDepthStencilState = {
      format: DEPTH_FORMAT,
      depthCompare: "less",
      depthWriteEnabled: true,
    };

    this.cubePipeline = await createRenderPipeline(gpu.device, {
      label: "Diagnostics cube pipeline",
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: "vertex_main",
        buffers: vertexBuffers,
      },
      fragment,
      primitive: {
        topology: "triangle-list",
        cullMode: "back",
        frontFace: "ccw",
      },
      depthStencil,
    });
    this.gridPipeline = await createRenderPipeline(gpu.device, {
      label: "Diagnostics grid pipeline",
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: "vertex_main",
        buffers: vertexBuffers,
      },
      fragment,
      primitive: { topology: "line-list" },
      depthStencil: {
        ...depthStencil,
        depthWriteEnabled: false,
      },
    });

    const cubeVertices = createCubeVertices();
    const gridVertices = createGridVertices();
    this.cubeVertexCount = getVertexCount(cubeVertices);
    this.gridVertexCount = getVertexCount(gridVertices);
    this.cubeBuffer = new GPUBufferResource(gpu.device, {
      label: "Diagnostics cube vertices",
      size: cubeVertices.byteLength,
      usage: GPUBufferUsage.VERTEX,
      initialData: cubeVertices,
    });
    this.gridBuffer = new GPUBufferResource(gpu.device, {
      label: "Diagnostics grid vertices",
      size: gridVertices.byteLength,
      usage: GPUBufferUsage.VERTEX,
      initialData: gridVertices,
    });
    this.bindGroup = createBindGroup(
      gpu.device,
      "Diagnostics camera bind group",
      cameraBindGroupLayout,
      [
        {
          binding: 0,
          resource: { buffer: cameraUniforms.resource.buffer },
        },
      ],
    );

    const folder = parameters.register(this.name);
    folder.add(this, "enabled").name("Enabled");
    folder.add(this, "showCube").name("Show cube");
    folder.add(this, "showGrid").name("Show grid");
  }

  public update(_frame: FrameInfo): void {}

  public render({
    commandEncoder,
    colorView,
  }: ModuleRenderContext): void {
    if (!this.depthTexture) {
      throw new Error("Diagnostics depth texture is not initialized.");
    }

    const renderPass = commandEncoder.beginRenderPass({
      label: "Engine diagnostics render pass",
      colorAttachments: [
        {
          view: colorView,
          clearValue: { r: 0.014, g: 0.02, b: 0.04, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: this.depthTexture.view,
        depthClearValue: 1,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    });

    if (this.enabled && this.bindGroup) {
      renderPass.setBindGroup(0, this.bindGroup);

      if (this.showGrid && this.gridPipeline && this.gridBuffer) {
        renderPass.setPipeline(this.gridPipeline);
        renderPass.setVertexBuffer(0, this.gridBuffer.buffer);
        renderPass.draw(this.gridVertexCount);
      }

      if (this.showCube && this.cubePipeline && this.cubeBuffer) {
        renderPass.setPipeline(this.cubePipeline);
        renderPass.setVertexBuffer(0, this.cubeBuffer.buffer);
        renderPass.draw(this.cubeVertexCount);
      }
    }

    renderPass.end();
  }

  public resize(size: CanvasSize): void {
    if (!this.device) {
      return;
    }

    this.depthTexture?.destroy();
    this.depthTexture = createDepthTexture(
      this.device,
      size.width,
      size.height,
      DEPTH_FORMAT,
    );
  }

  public destroy(): void {
    this.parameters?.remove(this.name);
    this.depthTexture?.destroy();
    this.cubeBuffer?.destroy();
    this.gridBuffer?.destroy();
    this.depthTexture = undefined;
    this.cubeBuffer = undefined;
    this.gridBuffer = undefined;
    this.bindGroup = undefined;
    this.cubePipeline = undefined;
    this.gridPipeline = undefined;
    this.parameters = undefined;
    this.device = undefined;
  }
}

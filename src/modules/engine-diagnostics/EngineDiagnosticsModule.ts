import {
  createCubeVertices,
  createGridVertices,
  getVertexCount,
} from "@/engine/geometry/ColoredGeometry";
import { createBindGroup } from "@/engine/graphics/bind-groups/BindGroupFactory";
import { GPUBufferResource } from "@/engine/graphics/buffers/GPUBufferResource";
import { Module } from "@/engine/modules/Module";
import {
  createDepthTexture,
  type TextureResource,
} from "@/engine/graphics/textures/TextureResource";
import fragmentShaderSource from "@/modules/engine-diagnostics/diagnostics.fragment.wgsl?raw";
import vertexShaderSource from "@/modules/engine-diagnostics/diagnostics.vertex.wgsl?raw";

const VERTEX_STRIDE = 6 * Float32Array.BYTES_PER_ELEMENT;
const DEPTH_FORMAT: GPUTextureFormat = "depth24plus";

export class EngineDiagnosticsModule extends Module {
  public readonly name = "Engine Diagnostics";

  public enabled = true;
  public showCube = true;
  public showGrid = true;

  private cubePipeline!: GPURenderPipeline;
  private gridPipeline!: GPURenderPipeline;
  private bindGroup!: GPUBindGroup;
  private cubeBuffer!: GPUBufferResource;
  private gridBuffer!: GPUBufferResource;
  private depthTexture!: TextureResource;
  private cubeVertexCount = 0;
  private gridVertexCount = 0;

  public async setup(): Promise<void> {
    const { gpu, cameraUniforms } = this.context;
    const vertex = await this.compileShader(vertexShaderSource, "vertex");
    const fragmentShader = await this.compileShader(
      fragmentShaderSource,
      "fragment",
    );

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
      module: fragmentShader,
      entryPoint: "main",
      targets: [{ format: gpu.presentationFormat }],
    };
    const depthStencil: GPUDepthStencilState = {
      format: DEPTH_FORMAT,
      depthCompare: "less",
      depthWriteEnabled: true,
    };

    this.cubePipeline = await gpu.device.createRenderPipelineAsync({
      label: "Diagnostics cube pipeline",
      layout: pipelineLayout,
      vertex: {
        module: vertex,
        entryPoint: "main",
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
    this.gridPipeline = await gpu.device.createRenderPipelineAsync({
      label: "Diagnostics grid pipeline",
      layout: pipelineLayout,
      vertex: {
        module: vertex,
        entryPoint: "main",
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

    const folder = this.parameters.register(this.name);
    folder.add(this, "enabled").name("Enabled");
    folder.add(this, "showCube").name("Show cube");
    folder.add(this, "showGrid").name("Show grid");
  }
  public resizeResources(): void {
    this.depthTexture?.destroy();
    this.depthTexture = createDepthTexture(
      this.device,
      this.size.width,
      this.size.height,
      DEPTH_FORMAT,
    );
  }

  public frame(): void {
    const renderPass = this.commandEncoder.beginRenderPass({
      label: "Engine diagnostics render pass",
      colorAttachments: [
        {
          view: this.colorView,
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

    if (this.enabled) {
      renderPass.setBindGroup(0, this.bindGroup);

      if (this.showGrid) {
        renderPass.setPipeline(this.gridPipeline);
        renderPass.setVertexBuffer(0, this.gridBuffer.buffer);
        renderPass.draw(this.gridVertexCount);
      }

      if (this.showCube) {
        renderPass.setPipeline(this.cubePipeline);
        renderPass.setVertexBuffer(0, this.cubeBuffer.buffer);
        renderPass.draw(this.cubeVertexCount);
      }
    }

    renderPass.end();
  }

  public teardown(): void {
    this.depthTexture?.destroy();
    this.cubeBuffer?.destroy();
    this.gridBuffer?.destroy();
  }
}

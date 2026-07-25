import type { PerspectiveCamera } from "./PerspectiveCamera";
import { UniformBuffer } from "../graphics/buffers/UniformBuffer";

const MATRIX_FLOATS = 16;
const CAMERA_UNIFORM_FLOATS = 36;

export class CameraUniforms {
  public readonly resource: UniformBuffer;
  private readonly data = new Float32Array(CAMERA_UNIFORM_FLOATS);

  public constructor(device: GPUDevice) {
    this.resource = new UniformBuffer(
      device,
      "Engine camera uniforms",
      this.data.byteLength,
    );
  }

  public update(camera: PerspectiveCamera): void {
    this.data.set(camera.viewProjectionMatrix, 0);
    this.data.set(camera.inverseViewProjectionMatrix, MATRIX_FLOATS);
    this.data.set(camera.position, MATRIX_FLOATS * 2);
    this.data[MATRIX_FLOATS * 2 + 3] = 1;
    this.resource.write(this.data);
  }

  public destroy(): void {
    this.resource.destroy();
  }
}

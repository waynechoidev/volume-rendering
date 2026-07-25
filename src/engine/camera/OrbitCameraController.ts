import { vec3 } from "gl-matrix";

import type { FrameInfo } from "@/engine/core/FrameLoop";
import type { InputManager } from "@/engine/input/InputManager";
import type { PerspectiveCamera } from "@/engine/camera/PerspectiveCamera";

const MIN_PITCH = -Math.PI * 0.48;
const MAX_PITCH = Math.PI * 0.48;

export class OrbitCameraController {
  public rotationSpeed = 0.006;
  public zoomSpeed = 0.0015;
  public panSpeed = 0.0015;
  public minDistance = 1.5;
  public maxDistance = 30;

  private yaw = 0.57;
  private pitch = 0.37;
  private distance = 6.8;
  private readonly position = vec3.create();

  public constructor(
    private readonly camera: PerspectiveCamera,
    private readonly input: InputManager,
  ) {
    this.updateCamera();
  }

  public update(_frame: FrameInfo): void {
    const pointer = this.input.pointer;
    this.yaw -= pointer.deltaX * this.rotationSpeed;
    this.pitch = Math.min(
      MAX_PITCH,
      Math.max(MIN_PITCH, this.pitch - pointer.deltaY * this.rotationSpeed),
    );

    const panScale = this.distance * this.panSpeed;
    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);
    const upX = -Math.sin(this.yaw) * Math.sin(this.pitch);
    const upY = Math.cos(this.pitch);
    const upZ = -Math.cos(this.yaw) * Math.sin(this.pitch);
    this.camera.target[0] +=
      (-rightX * pointer.panDeltaX + upX * pointer.panDeltaY) * panScale;
    this.camera.target[1] += upY * pointer.panDeltaY * panScale;
    this.camera.target[2] +=
      (-rightZ * pointer.panDeltaX + upZ * pointer.panDeltaY) * panScale;

    const zoomInput = pointer.wheelDelta - pointer.pinchDelta * 2.5;
    this.distance = Math.min(
      this.maxDistance,
      Math.max(
        this.minDistance,
        this.distance * Math.exp(zoomInput * this.zoomSpeed),
      ),
    );
    this.updateCamera();
  }

  public reset(): void {
    this.yaw = 0.57;
    this.pitch = 0.37;
    this.distance = 6.8;
    this.camera.target[0] = 0;
    this.camera.target[1] = 0.5;
    this.camera.target[2] = 0;
    this.updateCamera();
  }

  private updateCamera(): void {
    const horizontalDistance = Math.cos(this.pitch) * this.distance;
    this.position[0] =
      this.camera.target[0] + Math.sin(this.yaw) * horizontalDistance;
    this.position[1] =
      this.camera.target[1] + Math.sin(this.pitch) * this.distance;
    this.position[2] =
      this.camera.target[2] + Math.cos(this.yaw) * horizontalDistance;
    this.camera.setLookAt(this.position, this.camera.target);
  }
}

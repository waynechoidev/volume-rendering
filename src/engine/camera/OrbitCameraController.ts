import { quat, vec3 } from "gl-matrix";

import type { FrameInfo } from "@/engine/core/FrameLoop";
import type { InputManager } from "@/engine/input/InputManager";
import type { PerspectiveCamera } from "@/engine/camera/PerspectiveCamera";

const INITIAL_YAW = 0.57;
const INITIAL_PITCH = 0.37;
const INITIAL_DISTANCE = 6.8;
const BASE_OFFSET = vec3.fromValues(0, 0, 1);
const BASE_RIGHT = vec3.fromValues(1, 0, 0);
const BASE_UP = vec3.fromValues(0, 1, 0);

export class OrbitCameraController {
  public rotationSpeed = 0.006;
  public zoomSpeed = 0.0015;
  public panSpeed = 0.0015;
  public minDistance = 1.5;
  public maxDistance = 30;

  private readonly orientation = quat.create();
  private readonly rotationDelta = quat.create();
  private distance = INITIAL_DISTANCE;
  private readonly position = vec3.create();
  private readonly offset = vec3.create();
  private readonly right = vec3.create();
  private readonly up = vec3.create();

  public constructor(
    private readonly camera: PerspectiveCamera,
    private readonly input: InputManager,
  ) {
    this.resetOrientation();
    this.updateCamera();
  }

  public update(_frame: FrameInfo): void {
    const pointer = this.input.pointer;
    quat.identity(this.rotationDelta);
    quat.rotateY(
      this.rotationDelta,
      this.rotationDelta,
      -pointer.deltaX * this.rotationSpeed,
    );
    quat.rotateX(
      this.rotationDelta,
      this.rotationDelta,
      -pointer.deltaY * this.rotationSpeed,
    );
    quat.multiply(
      this.orientation,
      this.orientation,
      this.rotationDelta,
    );
    quat.normalize(this.orientation, this.orientation);

    const panScale = this.distance * this.panSpeed;
    vec3.transformQuat(this.right, BASE_RIGHT, this.orientation);
    vec3.transformQuat(this.up, BASE_UP, this.orientation);
    vec3.scaleAndAdd(
      this.camera.target,
      this.camera.target,
      this.right,
      -pointer.panDeltaX * panScale,
    );
    vec3.scaleAndAdd(
      this.camera.target,
      this.camera.target,
      this.up,
      pointer.panDeltaY * panScale,
    );

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
    this.resetOrientation();
    this.distance = INITIAL_DISTANCE;
    this.camera.target[0] = 0;
    this.camera.target[1] = 0.5;
    this.camera.target[2] = 0;
    this.updateCamera();
  }

  private updateCamera(): void {
    vec3.transformQuat(this.offset, BASE_OFFSET, this.orientation);
    vec3.scaleAndAdd(
      this.position,
      this.camera.target,
      this.offset,
      this.distance,
    );
    vec3.transformQuat(this.up, BASE_UP, this.orientation);
    this.camera.setLookAt(this.position, this.camera.target, this.up);
  }

  private resetOrientation(): void {
    quat.identity(this.orientation);
    quat.rotateY(this.orientation, this.orientation, INITIAL_YAW);
    quat.rotateX(this.orientation, this.orientation, -INITIAL_PITCH);
    quat.normalize(this.orientation, this.orientation);
  }
}

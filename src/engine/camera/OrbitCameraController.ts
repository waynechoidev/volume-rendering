import { quat, vec3 } from "gl-matrix";

import type { FrameInfo } from "@/engine/core/FrameLoop";
import type { InputManager } from "@/engine/input/InputManager";
import type { PerspectiveCamera } from "@/engine/camera/PerspectiveCamera";
import type { ModuleCameraView } from "@/engine/core/EngineModule";

const INITIAL_YAW = 0.57;
const INITIAL_PITCH = 0.37;
const INITIAL_DISTANCE = 6.8;
const BASE_OFFSET = vec3.fromValues(0, 0, 1);
const BASE_RIGHT = vec3.fromValues(1, 0, 0);
const BASE_UP = vec3.fromValues(0, 1, 0);
const DEFAULT_VIEW: ModuleCameraView = {
  yaw: INITIAL_YAW,
  pitch: INITIAL_PITCH,
  distance: INITIAL_DISTANCE,
  target: [0, 0.5, 0],
};

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
  private resetView: ModuleCameraView = DEFAULT_VIEW;

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

  public useView(view?: ModuleCameraView): void {
    this.reset(view ?? DEFAULT_VIEW);
  }

  public reset(view: ModuleCameraView = this.resetView): void {
    this.resetView = view;
    this.resetOrientation(view.yaw, view.pitch);
    this.distance = Math.min(
      this.maxDistance,
      Math.max(this.minDistance, view.distance),
    );
    const target = view.target ?? DEFAULT_VIEW.target!;
    this.camera.target[0] = target[0];
    this.camera.target[1] = target[1];
    this.camera.target[2] = target[2];
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

  private resetOrientation(
    yaw = DEFAULT_VIEW.yaw,
    pitch = DEFAULT_VIEW.pitch,
  ): void {
    quat.identity(this.orientation);
    quat.rotateY(this.orientation, this.orientation, yaw);
    quat.rotateX(this.orientation, this.orientation, -pitch);
    quat.normalize(this.orientation, this.orientation);
  }
}

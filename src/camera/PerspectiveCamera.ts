import { mat4, vec3, type ReadonlyVec3 } from "gl-matrix";

const WORLD_UP = vec3.fromValues(0, 1, 0);

export class PerspectiveCamera {
  public readonly position = vec3.fromValues(3.5, 2.8, 5.5);
  public readonly target = vec3.fromValues(0, 0.5, 0);
  public readonly viewMatrix = mat4.create();
  public readonly projectionMatrix = mat4.create();
  public readonly viewProjectionMatrix = mat4.create();
  public readonly inverseViewProjectionMatrix = mat4.create();

  public fieldOfViewDegrees = 52;
  public near = 0.05;
  public far = 200;

  private aspect = 1;

  public constructor() {
    this.updateMatrices();
  }

  public setAspect(aspect: number): void {
    if (!Number.isFinite(aspect) || aspect <= 0) {
      throw new RangeError("Camera aspect ratio must be positive.");
    }

    this.aspect = aspect;
    this.updateMatrices();
  }

  public setLookAt(position: ReadonlyVec3, target: ReadonlyVec3): void {
    vec3.copy(this.position, position);
    vec3.copy(this.target, target);
    this.updateMatrices();
  }

  public updateMatrices(): void {
    const near = Math.max(0.001, this.near);
    const far = Math.max(near + 0.001, this.far);
    const fieldOfView = Math.min(175, Math.max(1, this.fieldOfViewDegrees));

    mat4.lookAt(this.viewMatrix, this.position, this.target, WORLD_UP);
    mat4.perspectiveZO(
      this.projectionMatrix,
      (fieldOfView * Math.PI) / 180,
      this.aspect,
      near,
      far,
    );
    mat4.multiply(
      this.viewProjectionMatrix,
      this.projectionMatrix,
      this.viewMatrix,
    );

    if (
      !mat4.invert(
        this.inverseViewProjectionMatrix,
        this.viewProjectionMatrix,
      )
    ) {
      throw new Error("Camera view-projection matrix is not invertible.");
    }
  }
}

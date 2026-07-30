# Volume 01 — Camera Rays

## Goal

Volume rendering evaluates an integral along one three-dimensional ray per
pixel. Before density or ray marching can exist, the fragment shader must
recover that ray from the two-dimensional screen coordinate.

The goal of this stage is to transform the fullscreen UV coordinate
\(\mathbf{u}=(u,v)\) into the corresponding world-space ray direction
\(\mathbf{d}\). It does not intersect or integrate along the ray.

## 1. From texture coordinates to normalized device coordinates

The fullscreen vertex shader supplies

\[
\mathbf{u}=(u,v),\qquad u,v\in[0,1].
\]

WebGPU clip space uses \(x,y\in[-1,1]\). The affine map from an interval
\([a,b]\) to \([c,d]\) is

\[
y=c+\frac{x-a}{b-a}(d-c).
\]

Substituting \(a=0,b=1,c=-1,d=1\) gives \(2x-1\). The screen \(y\) axis is
flipped by the fullscreen shader's UV convention, so the shader uses:

```wgsl
let ndc = uv * vec2f(2.0, -2.0) + vec2f(-1.0, 1.0);
```

## 2. Undoing the camera projection

The camera maps a world-space homogeneous point \(\mathbf{p}_w\) to clip space:

\[
\mathbf{p}_c=P\,V\,\mathbf{p}_w.
\]

Multiplying both sides by the inverse matrix gives:

\[
\mathbf{p}_w=(PV)^{-1}\mathbf{p}_c.
\]

For a perspective camera the multiplication produces a homogeneous vector
\((x_h,y_h,z_h,w_h)\). Cartesian coordinates require the perspective divide:

\[
\mathbf{p}=
\left(
\frac{x_h}{w_h},
\frac{y_h}{w_h},
\frac{z_h}{w_h}
\right).
\]

The implementation chooses a point on the far clip plane:

```wgsl
let far_clip = vec4f(ndc, 1.0, 1.0);
let far_world_h = camera.inverse_view_projection * far_clip;
let far_world = far_world_h.xyz / far_world_h.w;
```

## 3. Constructing the ray

A ray is

\[
\mathbf{r}(t)=\mathbf{o}+t\mathbf{d},
\]

where \(\mathbf{o}\) is the camera position and \(\mathbf{d}\) is a unit
direction. The direction from the camera to the reconstructed far point is:

\[
\mathbf{d}=
\frac{\mathbf{p}_{far}-\mathbf{o}}
{\|\mathbf{p}_{far}-\mathbf{o}\|}.
\]

```wgsl
let ray_direction = normalize(far_world - camera.position.xyz);
```

Normalization makes \(t\) a world-space distance.

## 4. Visualizing the result

This stage has no volume to render yet. To make the reconstructed direction
visible, the shader maps its signed components from \([-1,1]\) to the
displayable color range \([0,1]\):

\[
\mathbf{C}_{debug}=\frac{1}{2}\mathbf{d}+\frac{1}{2}.
\]

```wgsl
return vec4f(ray_direction * 0.5 + 0.5, 1.0);
```

Red, green, and blue show the world-space \(x\), \(y\), and \(z\) components of
the ray direction. This color is only a debug visualization; the stage's
result is the direction \(\mathbf{d}\).

## Code correspondence

| Mathematics | WGSL |
| --- | --- |
| screen coordinate \(\mathbf{u}\) | `uv` |
| normalized device coordinate | `ndc` |
| \((PV)^{-1}\) | `camera.inverse_view_projection` |
| camera origin \(\mathbf{o}\) | `camera.position.xyz` |
| ray direction \(\mathbf{d}\) | `ray_direction` |

## GPU setup

`VolumeRenderingModule.ts` creates one camera uniform binding and one
fullscreen render pipeline. The engine supplies the already compiled
fullscreen vertex shader through `fullscreenVertexShader()`. Only the
fragment shader belongs to this research stage.

The camera uniform contract is:

```wgsl
struct CameraUniforms {
  view_projection: mat4x4f,
  inverse_view_projection: mat4x4f,
  position: vec4f,
};
```

## What to verify

- Orbiting changes the RGB field continuously.
- The center pixel points approximately toward the camera target.
- Opposite view directions produce complementary direction colors.
- No density, intersection, or ray marching exists yet.

# Volume 01 — Camera Rays

## Goal

Volume rendering은 pixel마다 하나의 3D ray를 따라 적분합니다. density나
ray marching을 구현하기 전에 fragment shader가 2D screen coordinate로부터
해당 ray를 복원해야 합니다.

이 단계의 목표는 fullscreen UV coordinate \(\mathbf{u}=(u,v)\)를 해당
world-space ray direction \(\mathbf{d}\)로 변환하는 것입니다. 아직 ray와
물체를 교차하거나 ray를 따라 적분하지 않습니다.

## 1. From texture coordinates to normalized device coordinates

fullscreen vertex shader는 다음 UV를 제공합니다.

\[
\mathbf{u}=(u,v),\qquad u,v\in[0,1].
\]

WebGPU clip space는 \(x,y\in[-1,1]\)을 사용합니다. 구간 \([a,b]\)를
\([c,d]\)로 옮기는 아핀 변환(affine mapping)은 다음과 같습니다.

\[
y=c+\frac{x-a}{b-a}(d-c).
\]

\(a=0,b=1,c=-1,d=1\)을 대입하면 \(2x-1\)입니다. fullscreen shader의
UV convention에서는 screen \(y\) axis가 뒤집혀 있으므로 다음 식을
사용합니다.

```wgsl
let ndc = uv * vec2f(2.0, -2.0) + vec2f(-1.0, 1.0);
```

## 2. Undoing the camera projection

camera는 world-space 동차 좌표점(homogeneous point) \(\mathbf{p}_w\)를 clip space로
변환합니다.

\[
\mathbf{p}_c=P\,V\,\mathbf{p}_w.
\]

양변에 역행렬(inverse matrix)을 곱하면 다음과 같습니다.

\[
\mathbf{p}_w=(PV)^{-1}\mathbf{p}_c.
\]

perspective camera에서 이 곱셈은 동차 벡터(homogeneous vector)
\((x_h,y_h,z_h,w_h)\)를 만듭니다. 직교 좌표(Cartesian coordinate)를
얻으려면 원근 나눗셈(perspective divide)이 필요합니다.

\[
\mathbf{p}=
\left(
\frac{x_h}{w_h},
\frac{y_h}{w_h},
\frac{z_h}{w_h}
\right).
\]

구현은 far clip plane 위의 점을 선택합니다.

```wgsl
let far_clip = vec4f(ndc, 1.0, 1.0);
let far_world_h = camera.inverse_view_projection * far_clip;
let far_world = far_world_h.xyz / far_world_h.w;
```

## 3. Constructing the ray

ray는 다음과 같습니다.

\[
\mathbf{r}(t)=\mathbf{o}+t\mathbf{d}.
\]

\(\mathbf{o}\)는 camera position이고 \(\mathbf{d}\)는 unit direction입니다.
camera에서 복원된 far point로 향하는 direction은 다음과 같습니다.

\[
\mathbf{d}=
\frac{\mathbf{p}_{far}-\mathbf{o}}
{\|\mathbf{p}_{far}-\mathbf{o}\|}.
\]

```wgsl
let ray_direction = normalize(far_world - camera.position.xyz);
```

정규화(normalization)했기 때문에 \(t\)는 world-space distance가 됩니다.

## 4. Visualizing the result

이 단계에는 아직 rendering할 volume이 없습니다. 복원된 direction을 확인할
수 있도록 부호 있는 성분(signed component) 범위 \([-1,1]\)을 color 범위 \([0,1]\)로
mapping합니다.

\[
\mathbf{C}_{debug}=\frac{1}{2}\mathbf{d}+\frac{1}{2}.
\]

```wgsl
return vec4f(ray_direction * 0.5 + 0.5, 1.0);
```

R, G, B는 각각 ray direction의 world-space \(x,y,z\) component를
보여줍니다. 이 color는 debug visualization일 뿐이며 실제 결과는
direction \(\mathbf{d}\)입니다.

## Code correspondence

| Mathematics | WGSL |
| --- | --- |
| screen coordinate \(\mathbf{u}\) | `uv` |
| normalized device coordinate | `ndc` |
| \((PV)^{-1}\) | `camera.inverse_view_projection` |
| camera origin \(\mathbf{o}\) | `camera.position.xyz` |
| ray direction \(\mathbf{d}\) | `ray_direction` |

## GPU setup

`VolumeRenderingModule.ts`는 camera uniform binding 하나와 fullscreen
render pipeline 하나를 만듭니다. 엔진은 `fullscreenVertexShader()`를 통해
미리 컴파일된 fullscreen vertex shader를 제공합니다. 이 연구 단계에는
fragment shader만 포함됩니다.

camera uniform contract는 다음과 같습니다.

```wgsl
struct CameraUniforms {
  view_projection: mat4x4f,
  inverse_view_projection: mat4x4f,
  position: vec4f,
};
```

## What to verify

- orbit할 때 RGB field가 연속적으로 변해야 합니다.
- 중앙 pixel은 대략 camera target을 향해야 합니다.
- 반대 view direction은 상호 보색인 direction color를 만들어야 합니다.
- 아직 density, intersection, ray marching은 존재하지 않습니다.

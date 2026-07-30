# 05 — Density Texture

## 목표

stage 04는 WGSL 함수에서 density를 직접 계산했습니다. 이 단계는 sampling된
스칼라 field(sampled scalar field)를 3D grid에 저장하고 필터링 가능한
`texture_3d<f32>`로 읽습니다.

volume rendering equation은 그대로입니다.

\[
\alpha_i=1-e^{-\sigma_i\delta_i},
\qquad
T_i=\prod_{j<i}(1-\alpha_j),
\]

\[
\hat{\mathbf{C}}
=
\sum_i T_i\alpha_i\mathbf{c}_i
+
T_{N+1}\mathbf{c}_{bg}.
\]

\(\sigma_i\)의 표현(representation)만 변경됩니다.

## 1. 연속적인 Position을 Texture Coordinate로 변환

world-space box의 범위는:

\[
\mathbf{x}\in[-h,h]^3.
\]

정규화된 texture coordinate는 \([0,1]^3\)이어야 합니다. 전체 너비(full width)
\(2h\)로 나눠 \([-1/2,1/2]\)를 만든 뒤 \(1/2\)를 더합니다.

\[
\mathbf{u}
=
\frac{\mathbf{x}}{2h}+\frac12.
\]

```wgsl
fn world_to_texture(position: vec3f) -> vec3f {
  return position / (2.0 * params.half_extent) + 0.5;
}
```

![World-space position을 정규화된 3D texture coordinate로 변환](./texture-coordinate-volume.svg)

## 2. Voxel Data 만들기

`density-data.ts`는 \(48^3\) grid를 만듭니다. voxel \((x,y,z)\)의
중심(center)은 \([-1,1]^3\)으로 mapping됩니다.

\[
p_x=2\frac{x+1/2}{W}-1.
\]

\(p_y,p_z\)도 같은 방식이며 ellipsoidal distance는:

\[
q=
\sqrt{
\left(\frac{p_x}{0.82}\right)^2+
\left(\frac{p_y}{0.55}\right)^2+
\left(\frac{p_z}{0.70}\right)^2
}.
\]

부드러운 density 전이(transition)는:

\[
\rho=1-\operatorname{smoothstep}(0.25,1,q).
\]

스칼라(scalar)는 `r8unorm`으로 양자화(quantization)합니다.

\[
v=\operatorname{round}(255\rho).
\]

sampling할 때 WebGPU는 byte를 대략 \(v/255\)로 변환합니다. 양자화
오차(quantization error)는 최대 약 \(1/(2\cdot255)\)입니다.

## 3. 3D Texture Upload

```ts
this.volumeTexture = new TextureResource(this.device, {
  size: {
    width: DENSITY_VOLUME_SIZE,
    height: DENSITY_VOLUME_SIZE,
    depthOrArrayLayers: DENSITY_VOLUME_SIZE,
  },
  dimension: "3d",
  format: "r8unorm",
  usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
});
```

`writeTexture()`는 선형 CPU 배열(linear CPU array)을 다음
메모리 배치(layout)로 해석합니다.

```ts
{
  bytesPerRow: DENSITY_VOLUME_SIZE,
  rowsPerImage: DENSITY_VOLUME_SIZE,
}
```

한 byte가 voxel 하나, 한 row가 \(x\) scanline 하나를 저장하며
`rowsPerImage`는 다음 \(z\) slice로 이동합니다.

## 4. 삼선형 필터링(Trilinear Filtering)

인접한 여덟 voxel(neighboring voxel) 사이의 coordinate에서 linear sampler는
세 번의 선형 보간(linear interpolation)을 수행합니다. 1D에서는:

![한 sample을 둘러싼 여덟 voxel 값을 결합하는 삼선형 필터링](./trilinear-filtering.svg)

\[
\operatorname{lerp}(a,b,f)=(1-f)a+fb.
\]

\(x,y,z\) 순서로 적용하면 여덟 모서리 값(corner value)을 결합합니다.

```wgsl
let density = textureSampleLevel(
  density_texture,
  density_sampler,
  texture_position,
  0.0,
).r * params.density_scale;
```

필터링(filtering)이 없으면 \(48^3\) grid가 voxel block으로 보입니다.

## 5. Binding 구성

| Binding | Resource | Purpose |
| --- | --- | --- |
| 0 | camera uniform | world-space ray 복원 |
| 1 | `texture_3d<f32>` | 저장된 scalar density |
| 2 | filtering sampler | trilinear interpolation |
| 3 | volume uniform | step, density, absorption, box size |

TypeScript의 `VolumeParameters` storage는 16 bytes입니다.

![16-byte VolumeParameters uniform의 memory layout](./uniform-memory-layout.svg)

`Uint32Array`와 `Float32Array`는 같은 `ArrayBuffer`를 바라보므로 각 field를
WGSL에 선언된 type으로 기록할 수 있습니다.

## 6. Parameters

- `Ray-march steps`: 중점 texture sample 개수
- `Density`: sampling한 density에 적용하는 배수
- `Absorption`: 각 segment에 사용하는 absorption coefficient
- `Volume size`: box의 half-extent이며 공통 기본값은 \(2\)

## 7. 이 단계에서 제외한 기능

- density 기울기(gradient)와 표면 법선(surface normal) 없음
- light direction 없음
- light 방향의 보조 march(secondary march) 없음
- 자체 그림자(self-shadow)와 powder 근사(approximation) 없음

모든 sample은 하나의 일정한 옅은 color(constant pale color)를 사용합니다.
따라서 형태(shape)와 불투명도(opacity)는 density와 투과율(transmittance)에서만
나옵니다.

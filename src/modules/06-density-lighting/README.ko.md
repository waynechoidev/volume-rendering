# Volume 06 — Density Lighting

이 최종 단계는 stage 05의 이산 volume rendering equation과 3D density
texture를 유지하면서 density 기울기(gradient) lighting과 light 방향의 짧은
보조 march(secondary march)를 추가합니다. camera ray의 합성
방정식(compositing equation)을 바꾸지 않고 물리적 투과율(transmittance)
위에 시각적 shading을 추가하는 것이 목적입니다.

## What this stage adds

- 하나의 타원체(ellipsoid) 대신 연결된 cloud 형태의 density field
- \(\nabla\rho\) 추정을 위한 전방 density 차분(forward density difference)
- 정규화된 의사 법선(normalized pseudo-normal) \(-\nabla\rho/\|\nabla\rho\|\)
- 짧은 light ray의 광학적 깊이 추정값(optical-depth estimate)
- 곡률(curvature), powder, view–light 예술적 항(artistic term)

lighting은 의도적으로 근사합니다. 핵심 volume 적분(integral)은 stage 04에서
유도한 식을 그대로 사용합니다.

## 1. Continuous volume rendering equation

origin \(\mathbf{o}\), direction \(\mathbf{d}\)인 camera ray:

\[
\mathbf{r}(t)=\mathbf{o}+t\mathbf{d}
\]

에 대해 연속 volume rendering model의 기대 pixel color(expected pixel color)는:

\[
\mathbf{C}(\mathbf{r}) =
\int_{t_n}^{t_f}
T(t)\,
\sigma(\mathbf{r}(t))\,
\mathbf{c}(\mathbf{r}(t),\mathbf{d})\,dt.
\]

- \(t_n,t_f\): volume 내부 ray segment의 near/far 경계(bound)
- \(\sigma(\mathbf{x})\): position \(\mathbf{x}\)의 미분 density(differential density),
  즉 단위 거리(unit distance)당 소멸(extinction)
- \(\mathbf{c}(\mathbf{x},\mathbf{d})\): position과 view direction에 따라
  달라질 수 있는 RGB 복사휘도(radiance)
- \(T(t)\): \(t_n\)에서 \(t\)까지 흡수되지 않고 남은 복사휘도(radiance) 비율

누적 투과율(accumulated transmittance)은 Beer–Lambert 감쇠(attenuation)를 따릅니다.

\[
T(t)=
\exp\left(
-\int_{t_n}^{t}\sigma(\mathbf{r}(s))\,ds
\right).
\]

sample 앞쪽 density가 높으면 \(T(t)\)가 작아져 뒤쪽 sample의 기여도(contribution)가
작아집니다.

## 2. Discrete volume rendering equation

ray interval을 \(N\)개 segment로 나눕니다. sample position \(t_i\), segment
length \(\delta_i=t_{i+1}-t_i\), density
\(\sigma_i=\sigma(\mathbf{r}(t_i))\), color
\(\mathbf{c}_i=\mathbf{c}(\mathbf{r}(t_i),\mathbf{d})\)에 대해:

\[
\alpha_i=1-\exp(-\sigma_i\delta_i).
\]

sample \(i\)에 도달하는 transmittance는:

\[
T_i=
\exp\left(
-\sum_{j=1}^{i-1}\sigma_j\delta_j
\right)
=
\prod_{j=1}^{i-1}(1-\alpha_j).
\]

따라서 discrete pixel color는:

\[
\hat{\mathbf{C}}(\mathbf{r})=
\sum_{i=1}^{N}
T_i\alpha_i\mathbf{c}_i
+
T_{N+1}\mathbf{c}_{bg}.
\]

sample 가중치(weight) \(w_i=T_i\alpha_i\)는 ray가 sample에 도달하고 해당
sample의 불투명도(opacity)가 충분할 때만 큽니다. 마지막 항은 마지막 sample
뒤에 남은 투과율(transmittance)로 background를 합성(compositing)합니다.

## 3. Exact correspondence with this shader

fragment shader는 equation을 front-to-back으로 구현합니다.

```wgsl
let alpha =
  1.0 - exp(-params.absorption * density * step_length);
radiance += transmittance * alpha * sample_color;
transmittance *= 1.0 - alpha;
```

| Equation | Shader |
| --- | --- |
| \(\delta_i\) | `step_length` |
| \(\sigma_i\) | `params.absorption * density` |
| \(\alpha_i\) | `alpha` |
| \(T_i\) | 현재 update 전 `transmittance` |
| \(\mathbf{c}_i\) | `sample_color` |
| \(T_i\alpha_i\mathbf{c}_i\) | `radiance`에 더하는 값 |
| \(T_{N+1}\mathbf{c}_{bg}\) | `transmittance * background` |

`density`에는 runtime density multiplier가 이미 포함됩니다.

\[
\sigma_i =
\texttt{absorption}\,
\texttt{densityScale}\,
\rho(\mathbf{x}_i).
\]

\(\rho\)는 3D texture에서 filtering해 읽은 값입니다.
`transmittance < 0.01`이면 marching을 일찍 종료합니다.

## 4. Implementation details

### Camera ray

fragment shader는 역 view-projection 행렬(inverse view-projection matrix)로
far-plane clip-space point를 변환합니다.

\[
\mathbf{p}_{world} =
\frac{(VP)^{-1}\mathbf{p}_{clip}}
     {\left((VP)^{-1}\mathbf{p}_{clip}\right)_w},
\qquad
\mathbf{d} =
\frac{\mathbf{p}_{world}-\mathbf{o}}
     {\|\mathbf{p}_{world}-\mathbf{o}\|}.
\]

### Ray bounds and sampling

density는 축 정렬 상자(axis-aligned box)를 차지합니다. 슬랩 교차
판정(slab intersection)으로 \(t_{entry}\), \(t_{exit}\)를 구하고 균일한
중점 sample(uniform midpoint sample)을 사용합니다.

\[
\delta =
\frac{t_{exit}-t_{entry}}{N},
\qquad
t_i=t_{entry}+\left(i+\frac12\right)\delta.
\]

`Ray-march steps`가 성능(performance)과 정확도(accuracy) 사이의
절충(tradeoff)을 제어합니다.

### Density volume

`volume-data.ts`는 결정론적(deterministic) \(64^3\) 스칼라 field를 만듭니다.
넓은 바탕(base)과 여러 타원체(ellipsoid)가 연결된 적운(cumulus) 형태를
만듭니다.

\[
\rho(\mathbf{x}) =
\operatorname{clamp}\left(k(E(\mathbf{x})-b),0,1\right).
\]

\(E\)는 ellipsoid field의 부드러운 합집합(smooth union)입니다. density는 `rgba8unorm` 3D
texture의 red channel에 저장하고 linear filtering으로 sampling합니다.

### Sample color and lighting

전방 density 차분(forward density difference)으로 바깥쪽을 향하는
법선(outward-facing normal)을 추정합니다.

\[
\mathbf{n}\approx
-\frac{\nabla\rho}{\|\nabla\rho\|}.
\]

light 방향의 짧은 보조 march(secondary march)로 광학적 깊이(optical depth)와
투과율(transmittance)을 추정합니다.

\[
\tau_L\approx
\sum_j\rho(\mathbf{x}+j\delta_L\mathbf{l})\delta_L,
\qquad
T_L=\exp(-\sigma\tau_L).
\]

기울기(gradient) lighting, light 투과율(transmittance), 작은 powder
항(term), view–light 정렬 항(alignment term)으로 `sample_color`를 만듭니다.
density와 투과율(transmittance) 변화를 쉽게 볼 수 있게 하는 예술적인 단일
산란 근사(artistic single-scattering approximation)입니다.

## Parameters

- `Ray-march steps`: 교차한 camera ray당 sample 수
- `Density`: 저장된 scalar field에 적용하는 multiplier
- `Absorption`: density에 적용하는 소멸 계수(extinction coefficient)
- `Cloud size`: world unit 기준 volume box의 half-extent

desktop에서는 128 step, coarse-pointer device에서는 fragment workload를
줄이기 위해 72 step으로 시작합니다.

## Files

- `VolumeRenderingModule.ts`: parameter, volume resource, screen-pass 관계
- `../../engine/shaders/fullscreen.vertex.wgsl`: 엔진이 cache하는 fullscreen
  vertex stage
- `volume.fragment.wgsl`: binding, density sampling, lighting, volume 적분(integration)
- `volume-data.ts`: 결정론적(deterministic) CPU-side density 생성

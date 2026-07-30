# Volume 03 — Homogeneous Medium

## Goal

이 단계는 box를 일정한(constant) density로 채웁니다. ray를 따라 density가 변하지
않으므로 volume rendering equation에 닫힌 형태의 해(closed-form solution)가 존재하며 아직
ray marching이 필요하지 않습니다.

## 1. Extinction over an infinitesimal distance

\(T(s)\)를 distance \(s\)만큼 이동한 뒤 살아남은 복사휘도(radiance)의 비율이라고
합니다. 짧은 distance \(ds\)에서 제거되는 비율은 다음에 비례합니다.

- 현재 살아남은 비율 \(T(s)\)
- 소멸 계수(extinction coefficient) \(\sigma\)
- 이동한 distance \(ds\)

따라서:

\[
dT=-\sigma T(s)\,ds,
\qquad
\frac{dT}{ds}=-\sigma T.
\]

변수를 분리하면:

\[
\frac{dT}{T}=-\sigma\,ds.
\]

\(T(0)=1\) 조건에서 0부터 \(L\)까지 적분하면:

\[
\ln T(L)-\ln 1=-\sigma L,
\]

\[
T(L)=e^{-\sigma L}.
\]

이 식이 Beer–Lambert law입니다.

## 2. Density and absorption

모듈은 무차원 density 조절값(dimensionless density control) \(\rho\)와 흡수
계수(absorption coefficient) \(\kappa\)를 분리합니다.

\[
\sigma=\kappa\rho.
\]

ray length \(L\)에 대한 광학적 깊이(optical depth)와 투과율(transmittance)은 다음과 같습니다.

\[
\tau=\kappa\rho L,
\qquad
T=e^{-\tau}.
\]

```wgsl
let optical_depth =
  params.absorption * params.density * distance_inside;
let transmittance = exp(-optical_depth);
```

## 3. Compositing a constant medium color

사라진 background 비율은 \(1-T\)입니다. 균질한 매질(homogeneous medium)의
일정한 color(constant color)를 \(\mathbf{c}_m\)이라 하면 결과는 다음과 같습니다.

\[
\mathbf{C}=(1-T)\mathbf{c}_m+T\mathbf{c}_{bg}.
\]

연속 방출-흡수 적분(continuous emission–absorption integral)으로도 유도할 수 있습니다.

\[
\mathbf{C}_{m}
=
\int_0^L T(s)\sigma\mathbf{c}_m\,ds.
\]

\(T(s)=e^{-\sigma s}\)를 대입하면:

\[
\mathbf{C}_{m}
=
\mathbf{c}_m
\int_0^L \sigma e^{-\sigma s}\,ds
=
(1-e^{-\sigma L})\mathbf{c}_m.
\]

여기에 살아남은 background \(e^{-\sigma L}\mathbf{c}_{bg}\)를 더하면 위의
합성 방정식(compositing equation)을 얻습니다.

## WGSL implementation

```wgsl
let distance_inside = interval.far - entry;
let optical_depth =
  params.absorption * params.density * distance_inside;
let transmittance = exp(-optical_depth);

let color =
  (1.0 - transmittance) * medium_color +
  transmittance * background;
```

## Uniform contract

```wgsl
struct MediumParameters {
  density: f32,
  absorption: f32,
  half_extent: f32,
  _padding: f32,
};
```

TypeScript는 동일한 네 개의 32-bit slot을 `Float32Array(4)`로 기록합니다.
마지막 slot은 uniform을 16 bytes로 맞추는 padding입니다.

## Parameters

- `Density`: \(\rho\)를 변경합니다.
- `Absorption`: \(\kappa\)를 변경합니다.
- `Volume size`: box와 가능한 path length \(L\)을 함께 변경합니다.

density나 absorption을 두 배로 하면 광학적 깊이(optical depth)가 두 배가 됩니다. volume
size를 두 배로 해도 모든 path가 정확히 두 배가 되지는 않지만, 중앙 path는
대략 비례해서 길어집니다.

## What changed from stage 02

- ray-box interval이 물리적인 travel distance를 나타냅니다.
- debug distance color를 Beer–Lambert transmittance가 대체합니다.
- density가 일정하므로 해석적 해(analytic solution)를 사용합니다.
- sampling loop, 3D texture, lighting은 아직 없습니다.

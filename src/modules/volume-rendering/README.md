# Volume Rendering Module

This module is a compact reference implementation of the volume rendering
equation. Its primary purpose is to make transmittance, opacity, sample weights,
and front-to-back compositing directly inspectable in WGSL.

## 1. Continuous volume rendering equation

For a camera ray with origin \(\mathbf{o}\) and direction \(\mathbf{d}\),

\[
\mathbf{r}(t)=\mathbf{o}+t\mathbf{d},
\]

the expected pixel color in the continuous volume rendering model is

\[
\mathbf{C}(\mathbf{r}) =
\int_{t_n}^{t_f}
T(t)\,
\sigma(\mathbf{r}(t))\,
\mathbf{c}(\mathbf{r}(t),\mathbf{d})\,dt.
\]

The terms are:

- \(t_n,t_f\): near and far bounds of the ray segment inside the volume.
- \(\sigma(\mathbf{x})\): differential volume density, or extinction per unit
  distance, at position \(\mathbf{x}\).
- \(\mathbf{c}(\mathbf{x},\mathbf{d})\): RGB radiance contributed at
  \(\mathbf{x}\), potentially dependent on viewing direction \(\mathbf{d}\).
- \(T(t)\): accumulated transmittance from \(t_n\) to \(t\), meaning the
  fraction of light not absorbed before reaching that point.

Accumulated transmittance follows Beer–Lambert attenuation:

\[
T(t)=
\exp\left(
-\int_{t_n}^{t}\sigma(\mathbf{r}(s))\,ds
\right).
\]

High density before a sample makes \(T(t)\) small, so samples hidden behind
opaque material contribute little to the final pixel.

## 2. Discrete volume rendering equation

The ray interval is divided into \(N\) segments. For sample position \(t_i\),
segment length

\[
\delta_i=t_{i+1}-t_i,
\]

density \(\sigma_i=\sigma(\mathbf{r}(t_i))\), and color
\(\mathbf{c}_i=\mathbf{c}(\mathbf{r}(t_i),\mathbf{d})\), the opacity of one
segment is

\[
\alpha_i=1-\exp(-\sigma_i\delta_i).
\]

The transmittance arriving at sample \(i\) is

\[
T_i=
\exp\left(
-\sum_{j=1}^{i-1}\sigma_j\delta_j
\right)
=
\prod_{j=1}^{i-1}(1-\alpha_j).
\]

The discrete pixel color is therefore

\[
\hat{\mathbf{C}}(\mathbf{r})=
\sum_{i=1}^{N}
T_i\alpha_i\mathbf{c}_i
+
T_{N+1}\mathbf{c}_{bg}.
\]

The sample weight

\[
w_i=T_i\alpha_i
\]

is large only when the ray reaches the sample and that sample is sufficiently
opaque. The final term composites the background color through the
transmittance remaining after the last sample.

## 3. Exact correspondence with this shader

The fragment shader implements the equation front-to-back:

```wgsl
let alpha =
  1.0 - exp(-params.absorption * density * step_length);
radiance += transmittance * alpha * sample_color;
transmittance *= 1.0 - alpha;
```

The code variables correspond to the equation as follows:

| Equation | Shader |
| --- | --- |
| \(\delta_i\) | `step_length` |
| \(\sigma_i\) | `params.absorption * density` |
| \(\alpha_i\) | `alpha` |
| \(T_i\) | `transmittance` before the current update |
| \(\mathbf{c}_i\) | `sample_color` |
| \(T_i\alpha_i\mathbf{c}_i\) | the value added to `radiance` |
| \(T_{N+1}\mathbf{c}_{bg}\) | `transmittance * background` |

`density` already includes the runtime density multiplier:

\[
\sigma_i =
\texttt{absorption}\,
\texttt{densityScale}\,
\rho(\mathbf{x}_i),
\]

where \(\rho\) is the filtered value read from the 3D texture. Marching stops
early when `transmittance < 0.01`; the omitted contribution is bounded by the
small amount of light still remaining.

## 4. Implementation details

### Camera ray

The fragment shader transforms a far-plane clip-space point with the inverse
view-projection matrix:

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

The density occupies an axis-aligned box. Slab intersection determines
\(t_{entry}\) and \(t_{exit}\). The module uses uniform midpoint samples:

\[
\delta =
\frac{t_{exit}-t_{entry}}{N},
\qquad
t_i=t_{entry}+\left(i+\frac12\right)\delta.
\]

Midpoint sampling reduces boundary bias. `Ray-march steps` controls the
performance–accuracy tradeoff.

### Density volume

`volume-data.ts` creates a deterministic \(64^3\) scalar field. A broad base and
several ellipsoids form a connected cumulus-like shape:

\[
\rho(\mathbf{x}) =
\operatorname{clamp}\left(k(E(\mathbf{x})-b),0,1\right),
\]

where \(E\) is a smooth union of ellipsoid fields. The density is stored in the
red channel of an `rgba8unorm` 3D texture and sampled with linear filtering.

### Sample color and lighting

Forward density differences estimate an outward-facing normal:

\[
\mathbf{n}\approx
-\frac{\nabla\rho}{\|\nabla\rho\|}.
\]

A short secondary march toward the light estimates optical depth and
transmittance:

\[
\tau_L\approx
\sum_j\rho(\mathbf{x}+j\delta_L\mathbf{l})\delta_L,
\qquad
T_L=\exp(-\sigma\tau_L).
\]

Gradient lighting, light transmittance, a small powder term, and a
view–light-alignment term produce `sample_color`. This is an artistic
single-scattering approximation used to make changes in density and
transmittance visually legible.

## Parameters

- `Ray-march steps`: number of samples per intersecting camera ray.
- `Density`: multiplier applied to the stored scalar field.
- `Absorption`: extinction coefficient applied to density.
- `Cloud size`: half-extent of the volume box in world units.

Desktop starts at 128 steps. Coarse-pointer devices start at 72 to reduce
fragment workload.

## Files

- `VolumeRenderingModule.ts`: parameters, volume resources, and screen-pass relationship.
- `volume.vertex.wgsl`: fullscreen vertex stage.
- `volume.fragment.wgsl`: bindings, density sampling, lighting, and volume integration.
- `volume-data.ts`: deterministic CPU-side density generation.
- `volume-data.test.ts`: density layout and determinism tests.

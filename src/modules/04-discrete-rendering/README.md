# 04 — Discrete Volume Rendering

## Goal

The medium now has a spatially varying density
\(\sigma(\mathbf{r}(t))\). The homogeneous closed form from stage 03 no longer
applies to the entire ray, so the interval is divided into short segments and
integrated numerically.

This stage implements the same discrete emission–absorption equation commonly
used by neural radiance fields, but its density field is an analytic ellipsoid
inside the WGSL shader. There is no 3D texture and no lighting.

![Splitting a ray into segments, sampling midpoints, and accumulating front to back](./discrete-ray-marching.svg)

The interval is divided into equal segments, density is evaluated at each
midpoint, and samples update color and transmittance from the camera toward the
back of the volume.

## 1. Continuous equation

For ray

\[
\mathbf{r}(t)=\mathbf{o}+t\mathbf{d},
\]

the color arriving at the camera is:

\[
\mathbf{C}=
\int_{t_n}^{t_f}
T(t)\,
\sigma(t)\,
\mathbf{c}(t)\,dt
+
T(t_f)\mathbf{c}_{bg}.
\]

The transmittance to position \(t\) is:

\[
T(t)=
\exp\left(
-\int_{t_n}^{t}\sigma(s)\,ds
\right).
\]

Here \(\sigma(t)\) has units of inverse distance. Multiplying it by a distance
produces dimensionless optical depth.

## 2. Piecewise-constant approximation

Split the ray into \(N\) segments. Segment \(i\) has length:

\[
\delta_i=t_{i+1}-t_i.
\]

Approximate density and color as constants \(\sigma_i,\mathbf{c}_i\) inside the
segment. Applying Beer–Lambert to only this segment gives its transmittance:

\[
T_{\mathrm{segment},i}=e^{-\sigma_i\delta_i}.
\]

Opacity is the fraction that did not survive:

\[
\alpha_i=1-e^{-\sigma_i\delta_i}.
\]

## 3. Transmittance before each sample

To reach sample \(i\), light must survive all previous segments:

\[
T_i=
\prod_{j<i}e^{-\sigma_j\delta_j}.
\]

Using \(1-\alpha_j=e^{-\sigma_j\delta_j}\):

\[
T_i=\prod_{j<i}(1-\alpha_j).
\]

The contribution of sample \(i\) is the probability of reaching it multiplied
by the probability of terminating there:

\[
w_i=T_i\alpha_i.
\]

Therefore:

\[
\hat{\mathbf{C}}
=
\sum_{i=1}^{N}T_i\alpha_i\mathbf{c}_i
+
T_{N+1}\mathbf{c}_{bg}.
\]

## 4. Front-to-back recurrence

The shader does not recompute the product for every sample. It carries one
running value:

```wgsl
var radiance = vec3f(0.0);
var transmittance = 1.0;

let alpha =
  1.0 - exp(-params.absorption * density * step_length);
  
radiance += transmittance * alpha * sample_color;
transmittance *= 1.0 - alpha;
```

Before the update, `transmittance` is \(T_i\). After the update, it is
\(T_{i+1}\).

## 5. Midpoint sampling

For a uniform step count:

\[
\delta=\frac{t_f-t_n}{N}.
\]

The sample is placed at the segment midpoint:

\[
t_i=t_n+\left(i+\frac12\right)\delta.
\]

```wgsl
let distance = entry + (f32(index) + 0.5) * step_length;
let position = origin + direction * distance;
```

Midpoint sampling has less bias than sampling only the segment's leading edge.
It is still an approximation: thin features can be missed when \(\delta\) is
large.

## 6. Analytic density field

The stage uses an ellipsoidal coordinate:

\[
q(\mathbf{x})=
\left\|
\left(
\frac{x}{0.78h},
\frac{y}{0.52h},
\frac{z}{0.68h}
\right)
\right\|.
\]

\(1-\operatorname{smoothstep}(0.35,1.0,q)\) produces a soft density that is
strongest in the center and zero outside the ellipsoid.

```wgsl
let normalized = position / params.half_extent;
let ellipsoid = length(normalized / vec3f(0.78, 0.52, 0.68));
return
  (1.0 - smoothstep(0.35, 1.0, ellipsoid)) *
  params.density_scale;
```

This function is intentionally simple: the stage teaches integration, not
density representation.

## Equation-to-code table

| Equation | WGSL |
| --- | --- |
| \(N\) | `step_count` |
| \(\delta\) | `step_length` |
| \(\sigma_i\) | `params.absorption * density` |
| \(\alpha_i\) | `alpha` |
| \(T_i\) | `transmittance` before update |
| \(\mathbf{c}_i\) | `sample_color` |
| \(\sum T_i\alpha_i\mathbf{c}_i\) | `radiance` |

## Parameters

- `Ray-march steps`: number of midpoint samples.
- `Density`: multiplier applied to the analytic density field.
- `Absorption`: absorption coefficient used by each segment.
- `Volume size`: box half-extent, with a shared default of \(2\).

## Numerical behavior

- More steps reduce integration error but increase fragment work linearly.
- Early termination at \(T<0.01\) skips at most about one percent of remaining
  background energy.
- `MAX_STEPS = 256` gives WGSL a static loop bound; the runtime count only
  determines where the loop exits.

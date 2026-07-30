# Volume 03 — Homogeneous Medium

## Goal

This stage fills the box with a constant density. Because the density does not
vary along the ray, the volume rendering equation has a closed-form solution;
ray marching is not needed yet.

## 1. Extinction over an infinitesimal distance

Let \(T(s)\) be the fraction of radiance that survives after traveling distance
\(s\). For a short distance \(ds\), the removed fraction is proportional to:

- the current surviving fraction \(T(s)\),
- the extinction coefficient \(\sigma\),
- the traveled distance \(ds\).

Therefore:

\[
dT=-\sigma T(s)\,ds,
\]

or:

\[
\frac{dT}{ds}=-\sigma T.
\]

Separating variables gives:

\[
\frac{dT}{T}=-\sigma\,ds.
\]

Integrating from \(0\) to \(L\), with \(T(0)=1\):

\[
\ln T(L)-\ln 1=-\sigma L,
\]

\[
T(L)=e^{-\sigma L}.
\]

This is the Beer–Lambert law.

## 2. Density and absorption

The module separates a dimensionless density control \(\rho\) from an
absorption coefficient \(\kappa\):

\[
\sigma=\kappa\rho.
\]

For the ray length from stage 02:

\[
\tau=\kappa\rho L
\]

is the optical depth, and:

\[
T=e^{-\tau}.
\]

```wgsl
let optical_depth =
  params.absorption * params.density * distance_inside;
let transmittance = exp(-optical_depth);
```

## 3. Compositing a constant medium color

The lost background fraction is \(1-T\). If the homogeneous medium contributes
a constant color \(\mathbf{c}_m\), the result is:

\[
\mathbf{C}=(1-T)\mathbf{c}_m+T\mathbf{c}_{bg}.
\]

This can also be derived from the continuous emission–absorption integral:

\[
\mathbf{C}_{m}
=
\int_0^L T(s)\sigma\mathbf{c}_m\,ds.
\]

Substitute \(T(s)=e^{-\sigma s}\):

\[
\mathbf{C}_{m}
=
\mathbf{c}_m
\int_0^L \sigma e^{-\sigma s}\,ds
=
(1-e^{-\sigma L})\mathbf{c}_m.
\]

Adding the surviving background \(e^{-\sigma L}\mathbf{c}_{bg}\) produces the
compositing equation above.

## Exact WGSL

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

The TypeScript side writes the same four 32-bit slots with a
`Float32Array(4)`. The final slot is padding so the uniform occupies 16 bytes.

## Parameters

- `Density` changes \(\rho\).
- `Absorption` changes \(\kappa\).
- `Volume size` changes both the box and the possible path length \(L\).

Doubling either density or absorption doubles optical depth. Doubling volume
size does not uniformly double every path, but it increases central paths
approximately proportionally.

## What changed from stage 02

- The ray-box interval now represents a physical travel distance.
- Beer–Lambert transmittance replaces the diagnostic distance color.
- The solution is analytic because density is constant.
- There is still no sampling loop, 3D texture, or lighting.

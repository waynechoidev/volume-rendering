# Volume Rendering Module

This module is a compact reference implementation of direct volume rendering.
It renders a scalar density field stored in a 3D texture by integrating samples
along one camera ray per screen pixel.

## 1. Density volume

`volume-data.ts` creates a deterministic \(64^3\) scalar field. A broad base and
several progressively smaller ellipsoids form the characteristic cauliflower
lobes of a cumulus cloud. A soft accumulated union joins their low-density tails
without hard seams or disconnected pieces:

\[
\rho(\mathbf{x}) =
\operatorname{clamp}\left(k(E(\mathbf{x})-b),0,1\right)
\]

Here \(E\) is the smooth union of the ellipsoid fields, \(b\) controls its soft
boundary, and \(k\) scales the resulting density. A height-based smoothstep
produces the flatter underside.

The scalar is stored in the red channel of an `rgba8unorm` 3D texture. The
texture is uploaded once and linearly filtered by the GPU during ray marching.

## 2. Camera ray

The fragment shader converts the pixel coordinate to normalized device
coordinates and transforms a point on the far plane with the inverse
view-projection matrix:

\[
\mathbf{p}_{world} =
\frac{(VP)^{-1}\mathbf{p}_{clip}}
     {\left((VP)^{-1}\mathbf{p}_{clip}\right)_w}
\]

With camera position \(\mathbf{o}\), the ray direction is:

\[
\mathbf{d} =
\frac{\mathbf{p}_{world}-\mathbf{o}}
     {\|\mathbf{p}_{world}-\mathbf{o}\|}
\]

## 3. Ray–box intersection

The density occupies an axis-aligned box. The slab method computes intersection
distances for each pair of box planes:

\[
\mathbf{t}_0 =
\frac{\mathbf{b}_{min}-\mathbf{o}}{\mathbf{d}},
\qquad
\mathbf{t}_1 =
\frac{\mathbf{b}_{max}-\mathbf{o}}{\mathbf{d}}
\]

The ray enters at the largest component-wise minimum and exits at the smallest
component-wise maximum. Pixels whose exit distance precedes their entry distance
do not hit the volume.

## 4. Ray marching

The interval is divided into \(N\) equal steps:

\[
\Delta s = \frac{t_{exit}-t_{entry}}{N},
\qquad
\mathbf{x}_i = \mathbf{o} +
\left(t_{entry}+(i+\tfrac12)\Delta s\right)\mathbf{d}
\]

Midpoint samples reduce bias compared with sampling at a step boundary.
`Ray-march steps` trades performance for accuracy.

## 5. Absorption and compositing

For density \(\rho_i\), absorption coefficient \(\sigma\), and step length
\(\Delta s\), Beer–Lambert transmittance through one step is:

\[
T_i = e^{-\sigma\rho_i\Delta s}
\]

Its opacity is:

\[
\alpha_i = 1-T_i
\]

Samples are accumulated front-to-back:

\[
\mathbf{C} \leftarrow
\mathbf{C} + T\,\alpha_i\,\mathbf{c}_i,
\qquad
T \leftarrow T(1-\alpha_i)
\]

Marching stops early when \(T < 0.01\), because later contributions are
negligible. The remaining transmittance reveals the background.

## 6. Volumetric lighting

Three forward differences estimate the local density gradient. Because density
increases toward the cloud interior, its negative points approximately outward:

\[
\mathbf{n}\approx-\frac{
\left(\rho(x+h)-\rho(x),\rho(y+h)-\rho(y),\rho(z+h)-\rho(z)\right)}
{\|\nabla\rho\|}
\]

The term \(\max(\mathbf{n}\cdot\mathbf{l},0)\) makes lobes facing the sun bright
and opposing folds dark. Its influence is weighted by gradient magnitude so
uniform interior regions do not look like solid surfaces.

At each visible sample, a short secondary ray marches toward the light and
estimates its optical depth:

\[
\tau_L \approx \sum_j \rho(\mathbf{x}+j\Delta s_L\mathbf{l})\Delta s_L,
\qquad
T_L=e^{-\sigma\tau_L}
\]

Bright samples have a clear path to the sun; shadowed samples have cloud density
in front of them. This remains a single-scattering approximation, but it creates
soft internal shadows without incorrectly treating the volume as a solid
surface. A small powder term brightens dense edges, approximating some of the
visual effect of multiple scattering.

## Parameters

- `Ray-march steps`: number of samples per intersecting ray.
- `Density`: multiplier applied to texture density.
- `Absorption`: extinction strength \(\sigma\).
- `Cloud size`: half-extent of the volume box in world units.

Desktop starts at 128 steps. Coarse-pointer mobile devices start at 72 to reduce
fragment workload.

## Files

- `VolumeRenderingModule.ts`: GPU resources, pipeline, parameters, and lifecycle.
- `volume-rendering.wgsl`: ray construction, intersection, integration, lighting.
- `volume-data.ts`: deterministic CPU-side density generation.
- `volume-data.test.ts`: density layout and determinism tests.

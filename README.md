# Volume Rendering

A step-by-step WebGPU study of camera rays, volumetric transmittance, discrete
ray marching, 3D textures, and transfer-function rendering of 16-bit CT data.

[Open the live sample](https://waynechoidev.github.io/volume-rendering/)

## Abstract

This project builds a volume renderer from the mathematical foundation upward.
For every screen pixel, the renderer reconstructs a world-space camera ray,
finds the interval inside a finite volume, samples density along that interval,
and accumulates color and transmittance from front to back.

The final module stores the isotropic $256^3$ Aneurism angiography dataset in
an `r8unorm` 3D texture and precomputes its gradient field. An interactive 2D
transfer function maps intensity and gradient magnitude to vessel-boundary and
dense-core color and extinction.

The central discrete rendering equation is:

$$
\hat{\mathbf{C}}=
\sum_{i=1}^{N}T_i\alpha_i\mathbf{c}_i+
T_{N+1}\mathbf{c}_{bg},
$$

where:

$$
\alpha_i=1-\exp(-\sigma_i\delta_i),
\qquad
T_i=\prod_{j<i}(1-\alpha_j).
$$

Each stage keeps the corresponding WGSL, TypeScript integration, equations,
and derivations together so the implementation can be studied incrementally.

## Implementation Steps

```text
src/modules/
├── 00-overview/
├── 01-camera-rays/
├── 02-ray-box/
├── 03-homogeneous-medium/
├── 04-discrete-rendering/
├── 05-density-texture/
├── 06-aneurism-transfer-function/
└── 07-2d-transfer-function/
```

### 00 — Overview

Introduces the complete renderer and summarizes how the seven implementation
stages fit together. This directory contains documentation only; the runtime
entry displays the final stage.

### 01 — Camera Rays

Transforms fullscreen UV coordinates into one normalized world-space ray
direction per pixel using the camera's inverse view-projection matrix.

### 02 — Ray Box Intersection

Uses the slab method to find the near and far distances for which each ray lies
inside an axis-aligned volume box.

### 03 — Homogeneous Medium

Fills the interval with constant density and derives the analytic
Beer–Lambert transmittance and emission–absorption compositing equation.

### 04 — Discrete Rendering

Introduces spatially varying density, midpoint ray samples, per-segment opacity,
and front-to-back transmittance accumulation.

### 05 — Density Texture

Moves the scalar density field into a filterable 3D texture and explains
world-to-texture mapping, voxel upload, and trilinear filtering.

### 06 — Aneurism 1D Transfer Function

Loads the isotropic $256^3$ Aneurism volume and maps scalar intensity to
vascular color and extinction through editable bands on a 1D histogram.

### 07 — Aneurism 2D Transfer Function

Loads the isotropic $256^3$ Aneurism angiography dataset, precomputes gradient
magnitude on the GPU, and uses editable 2D regions to reveal vessel boundaries
and dense contrast-filled cores.

Every stage provides both `README.md` and `README.ko.md`. Use the `EN`/`KO`
button in the runtime README viewer to switch languages.

## Final Pipeline

```text
screen UV
→ world-space camera ray
→ ray–volume interval
→ 3D density sampling
→ discrete transmittance and color accumulation
→ intensity–gradient 2D transfer function
→ final pixel color
```

## Running Locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite. WebGPU requires a secure context: `localhost` is
accepted locally, while access from another device must use trusted HTTPS.

Production verification:

```bash
npm run typecheck
npm test
npm run build
```

## Controls

- Drag: orbit
- Mouse wheel or pinch: zoom
- Right-drag or Shift+drag: pan
- Two-finger drag: pan
- Reset icon: restore the initial camera
- README: open the equations and implementation notes for the selected stage

## Runtime Parameters

The final stage exposes:

- `Vessel preset`: combined, boundary-only, or dense-core visualization
- logarithmic intensity–gradient joint histogram with editable vessel regions
- `Ray-march steps`: samples per intersecting camera ray
- global opacity scale

Small screens start with fewer ray-march steps to reduce fragment workload
without reducing the source volume resolution.

## GitHub Pages

Pushing `main` runs `.github/workflows/deploy-pages.yml`, which tests, builds,
and deploys the project. Before the first deployment, set
**Settings → Pages → Build and deployment → Source** to **GitHub Actions**.

## Engine

Built with
[WebGPU Research Engine](https://github.com/waynechoidev/webgpu-research-engine).
This repository contains the engine snapshot used during this project's
development.

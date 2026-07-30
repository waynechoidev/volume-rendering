# Volume Rendering

A step-by-step WebGPU study of camera rays, volumetric transmittance, discrete
ray marching, 3D density textures, and density-based cloud lighting.

[Open the live sample](https://waynechoidev.github.io/volume-rendering/)

## Abstract

This project builds a volume renderer from the mathematical foundation upward.
For every screen pixel, the renderer reconstructs a world-space camera ray,
finds the interval inside a finite volume, samples density along that interval,
and accumulates color and transmittance from front to back.

The final module stores a connected cloud-like density field in a 3D texture.
It estimates local shape from the density gradient and performs a short
secondary march toward the light to approximate self-shadowing.

The central discrete rendering equation is:

\[
\hat{\mathbf{C}}=
\sum_{i=1}^{N}T_i\alpha_i\mathbf{c}_i+
T_{N+1}\mathbf{c}_{bg},
\]

where:

\[
\alpha_i=1-\exp(-\sigma_i\delta_i),
\qquad
T_i=\prod_{j<i}(1-\alpha_j).
\]

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
└── 06-density-lighting/
```

### 00 — Overview

Introduces the complete renderer and summarizes how the six implementation
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

### 06 — Density Lighting

Builds the final connected cloud density field, estimates a pseudo-normal from
density gradients, and approximates light transmittance with a secondary march.

Every stage provides both `README.md` and `README.ko.md`. Use the `EN`/`KO`
button in the runtime README viewer to switch languages.

## Final Pipeline

```text
screen UV
→ world-space camera ray
→ ray–volume interval
→ 3D density sampling
→ discrete transmittance and color accumulation
→ density-gradient lighting
→ light-ray optical-depth estimate
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

- `Ray-march steps`: samples per intersecting camera ray
- `Density`: multiplier applied to the stored scalar field
- `Absorption`: extinction coefficient applied to density
- `Cloud size`: half-extent of the volume box in world units

Mobile and coarse-pointer devices start with fewer ray-march steps to reduce
fragment workload.

## GitHub Pages

Pushing `main` runs `.github/workflows/deploy-pages.yml`, which tests, builds,
and deploys the project. Before the first deployment, set
**Settings → Pages → Build and deployment → Source** to **GitHub Actions**.

## Engine

Built with
[WebGPU Research Engine](https://github.com/waynechoidev/webgpu-research-engine).
This repository contains the engine snapshot used during this project's
development.

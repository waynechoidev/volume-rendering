# GPU Particles

This module simulates and renders a large particle system entirely on the GPU.
Particles orbit a central gravitational field and form a colorful,
black-hole-like accretion flow.

## Particle state

Each particle stores position and velocity in a storage buffer. Two equal
buffers are used in a ping-pong arrangement:

```text
frame n:     A -> compute -> B -> render
frame n + 1: B -> compute -> A -> render
```

This avoids copying particle state back to the CPU.

## Simulation

For particle position \(\mathbf{x}\), the acceleration toward the origin is
based on inverse-square gravity:

\[
\mathbf{a}=
-G\frac{\mathbf{x}}{\left(\|\mathbf{x}\|^2+\epsilon\right)^{3/2}}
\]

The softening term \(\epsilon\) prevents an unstable singularity near the
center. The compute pass dispatches 256 particles per workgroup:

\[
N=\left\lceil\frac{\text{particleCount}}{256}\right\rceil
\]

## Rendering

Every particle is rendered as a camera-facing six-vertex quad using instancing.
The vertex shader reads particle state directly from the latest simulation
buffer. Additive color blending produces bright trails where particles overlap.

## Parameters

- `Particle count`: number of simulated and rendered particles.
- `Black hole mass`: gravitational strength.
- `Simulation speed`: time scale applied to integration.
- `Bounds`: spatial reset boundary.
- `Point size`: rendered particle size.
- `Reset particles`: recreates the deterministic initial state.

Desktop defaults to 131,072 particles. Coarse-pointer devices default to 32,768
to reduce GPU memory and compute load.

## Files

- `GPUParticleModule.ts`: module composition, parameters, and lifecycle.
- `ParticleSimulation.ts`: compute pipeline and ping-pong storage buffers.
- `ParticleRenderer.ts`: instanced rendering and depth resources.
- `particle.compute.wgsl`: particle integration.
- `particle.render.wgsl`: billboard construction and coloring.
- `particle-data.ts`: deterministic initial state.
- `particle-data.test.ts`: particle-layout and initialization tests.


# Volume Rendering

## Abstract

This project builds a WebGPU volume renderer from the camera-ray foundation to
a lit three-dimensional density field. For every screen pixel, the renderer
reconstructs a world-space ray, limits it to a finite volume, samples density
along the bounded interval, and accumulates color and transmittance using the
discrete volume rendering equation.

The final result stores a connected cloud-like density field in a 3D texture.
Density gradients provide local shape cues, while a secondary march toward the
light estimates self-shadowing. The implementation keeps the ray construction,
intersection, density representation, integration, and lighting stages visible
so each part can be studied and modified independently.

## Implementation Steps

### 01 — Camera Rays

Transform the fullscreen UV coordinate into a world-space ray. The camera's
inverse view-projection matrix reconstructs a point on the far plane, and the
normalized vector from the camera to that point becomes the ray direction.
The direction is displayed as RGB for validation.

### 02 — Ray Box Intersection

Intersect each camera ray with an axis-aligned box using the slab method. The
result is the near and far distance along the ray for which the sample position
lies inside the finite volume.

### 03 — Homogeneous Medium

Fill the bounded interval with constant density. Beer–Lambert attenuation gives
an analytic transmittance and opacity, introducing the physical meaning of
extinction without a sampling loop.

### 04 — Discrete Rendering

Allow density to vary through space and divide the ray interval into short
segments. Midpoint samples are accumulated front to back using per-segment
opacity and the transmittance that reaches each sample.

### 05 — Density Texture

Move the scalar density field into a filterable 3D texture. World-space sample
positions are mapped to texture coordinates, and trilinear filtering provides
a continuous density estimate between voxels.

### 06 — Density Lighting

Estimate a local pseudo-normal from the density gradient and march a short
secondary ray toward the light to approximate optical depth and self-shadowing.
These terms shade the connected density field without changing the underlying
camera-ray compositing equation.

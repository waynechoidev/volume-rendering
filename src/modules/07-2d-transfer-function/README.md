# 07 — Aneurism 2D Transfer Function

This chapter applies a two-dimensional transfer function to the classic
Aneurism volume. The dataset is a contrast-enhanced rotational C-arm X-ray
scan of arteries in the right half of a human head; an aneurism is present.
It is provided courtesy of Philips Research, Hamburg, Germany.

It uses the same isotropic $256^3$ unsigned 8-bit volume as stage 06. This
keeps the dataset fixed while the transfer-function domain changes from 1D
intensity to 2D intensity–gradient classification.

## 1. Volume representation

The volume contains:

$$
256^3=16{,}777{,}216
$$

samples with spacing $1:1:1$. A voxel is addressed in the raw file by:

$$
i=x+256(y+256z).
$$

The byte value is uploaded without conversion to a filterable `r8unorm` 3D
texture. Sampling returns $[0,1]$, so the shader restores the source domain:

$$
v=255\,\operatorname{textureSample}(\mathbf{u}).
$$

Because all three axes have equal spacing, the world volume is a cube and no
slice-axis scale correction is required.

## 2. Why a 2D transfer function

Contrast-filled vessels are bright, but intensity alone cannot distinguish a
thin vessel boundary from a similarly valued interior. The classifier uses:

$$
\tau(v,g):(v,g)\longmapsto(\mathbf{c},\sigma),
\qquad
g=\|\nabla v\|.
$$

The horizontal axis $v$ selects source intensity. The vertical axis $g$
selects how rapidly intensity changes around the voxel. Dense vessel interiors
usually have high intensity and lower gradient; vessel walls have a stronger
gradient.

## 3. Gradient preprocessing

At setup, a compute shader evaluates central differences:

$$
v_x\approx\frac{v(x+1,y,z)-v(x-1,y,z)}{2},
$$

$$
v_y\approx\frac{v(x,y+1,z)-v(x,y-1,z)}{2},
\qquad
v_z\approx\frac{v(x,y,z+1)-v(x,y,z-1)}{2}.
$$

Since spacing is isotropic, every denominator is 2. Gradient magnitude and
direction are:

$$
g=\sqrt{v_x^2+v_y^2+v_z^2},
\qquad
\mathbf{n}=\frac{\nabla v}{\max(g,\epsilon)}.
$$

A `4×4×4` compute workgroup writes an `rgba8unorm` 3D texture:

$$
\text{RGB}=\frac{\mathbf{n}}2+\frac12,
\qquad
A=\operatorname{clamp}\left(\frac{g}{128},0,1\right).
$$

Precomputation avoids six extra intensity loads at every ray-march sample.

## 4. Joint histogram

The editor shows:

$$
H(i,j)=\#\{\mathbf{x}\mid v(\mathbf{x})\in I_i,\,
g(\mathbf{x})\in G_j\}.
$$

- horizontal axis: intensity $0\ldots255$;
- vertical axis: gradient magnitude $0\ldots128$;
- brightness: logarithmic nonzero-voxel count.

Zero-valued background voxels are omitted from the UI histogram so the sparse
vascular structure remains visible. Rendering still samples the complete
volume.

Two editable regions are provided:

| Region | Intensity | Gradient | Purpose |
| --- | ---: | ---: | --- |
| Vessel boundary | 18–210 | 4–105 | red vascular walls and branches |
| Dense vessel core | 145–255 | 0–72 | pale contrast-filled interiors |

These are visualization starting points, not clinical segmentation.

## 5. Region classification

For interval $[a,b]$, the shader constructs a feathered range weight:

$$
R(x;a,b)=R_{\min}(x)R_{\max}(x).
$$

The lower factor rises with `smoothstep`; the upper factor falls near $b$.
If a region touches zero or the domain maximum, the corresponding edge remains
open so values exactly at 0 or 255 are not accidentally removed.

Each 2D region multiplies its two coordinates:

$$
w_m(v,g)=
R(v;v_{m,0},v_{m,1})
R(g;g_{m,0},g_{m,1}).
$$

Color and extinction are:

$$
\mathbf{c}=
\frac{w_v\mathbf{c}_v+w_c\mathbf{c}_c}
{\max(w_v+w_c,\epsilon)},
\qquad
\sigma=k(a_vw_v+a_cw_c).
$$

The UI extinction is defined per voxel rather than per arbitrary world unit.
The world-space step is therefore converted to voxel distance:

$$
\delta_{\mathrm{voxel}}=
\delta_{\mathrm{world}}
\frac{N_x}{2h_x}.
$$

The ray marcher converts extinction to per-step opacity:

$$
\alpha_i=1-\exp(-\sigma_i\delta_{\mathrm{voxel}}),
$$

then uses the same front-to-back compositing equation derived in stage 04.
This normalization makes opacity controls remain meaningful when the world
volume size or ray-march sample count changes.

The gradient RGB also supplies a normal for a small ambient-plus-diffuse term.
It does not change classification or opacity; it adds local contrast so curved
vessels do not appear as uniformly colored fog.

## Parameters

- `Transfer preset`: boundary and core, vessel boundary only, dense core only,
  or custom.
- `Ray-march steps`: 448 on desktop and 288 on small screens.
- `Opacity scale`: common extinction multiplier.
- `Volume size`: shared half-extent of the volume bounds.
- `I min/max`: selected source-intensity interval.
- `G min/max`: selected gradient-magnitude interval.
- `Opacity`: extinction strength of the selected region.

## Limitations

- Classification is intended for visualization, not diagnosis.
- Gradient direction and magnitude are quantized to `rgba8unorm`.
- The UI histogram samples every second voxel; rendering uses full resolution.
- No lighting is applied yet, although the precomputed RGB normal is available
  for a later chapter.

## Sample Data and Rights

This module uses the **Aneurism** sample provided courtesy of **Philips
Research, Hamburg, Germany**. The current asset was obtained from the TC18
mirror documented by Teem:

- [Teem VolVis instructions](https://teem.sourceforge.net/nrrd/volvis/index.html)
- [TC18 dataset mirror](https://tc18.org/3D_images.html)

No standalone standard license accompanies the download. TC18 describes its
hosted datasets as “supposed to be copyleft,” which is not a precise license
grant. Preserve the attribution and `src/data/aneurism/README.md` when
redistributing the volume.

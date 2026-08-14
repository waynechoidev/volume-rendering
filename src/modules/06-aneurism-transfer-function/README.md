# 06 — Aneurism 1D Transfer Function

This chapter renders the Aneurism angiography volume with a one-dimensional
transfer function. It establishes the intensity-only baseline that chapter 07
extends with gradient magnitude.

The isotropic $256^3$ unsigned 8-bit dataset is stored once in
`src/data/aneurism/` and shared by both chapters. It was provided courtesy of
Philips Research, Hamburg, Germany. More than 99% of the voxels are zero; the
nonzero values primarily describe the contrast-filled vascular structure.

## 1. Scalar intensity

The raw byte at voxel $(x,y,z)$ is addressed by:

$$
i=x+256(y+256z).
$$

It is uploaded unchanged to a filterable `r8unorm` 3D texture. Texture
sampling returns a normalized value, so the source intensity is:

$$
v=255\,\operatorname{textureSample}(\mathbf u).
$$

## 2. The 1D transfer function

A transfer function maps the single intensity $v$ to emitted color
$\mathbf c$ and extinction $\sigma$:

$$
\tau(v):v\longmapsto(\mathbf c,\sigma).
$$

The editor shows the volume's intensity histogram and two editable bands:

| Band | Intensity | Purpose |
| --- | ---: | --- |
| Vessels | 18–180 | broad red vascular structure |
| Dense core | 145–255 | pale high-intensity interior |

For a feathered range weight $R(v;a,b)$, the sample values are:

$$
\mathbf c(v)=
\frac{w_v\mathbf c_v+w_c\mathbf c_c}
{\max(w_v+w_c,\epsilon)},
\qquad
\sigma(v)=k(a_vw_v+a_cw_c).
$$

Here $w_v=R(v;v_0,v_1)$, $w_c=R(v;c_0,c_1)$, $a_v,a_c$ are band
opacities, and $k$ is the global opacity scale.

## 3. Rendering

The ray marcher converts its world-space step to voxel distance:

$$
\delta_{\mathrm{voxel}}=
\delta_{\mathrm{world}}\frac{256}{2h_x}.
$$

Beer–Lambert attenuation gives the opacity of one sample:

$$
\alpha_i=1-\exp(-\sigma_i\delta_{\mathrm{voxel}}).
$$

Samples are accumulated front to back using the equation derived in chapter
04. There is no gradient texture or lighting in this stage. Consequently,
voxels with the same intensity receive the same classification even when one
is on a vessel boundary and another is in its interior. That ambiguity is the
specific limitation addressed by chapter 07.

## Parameters

- `Transfer preset`: both intensity bands, the broad vessel band, the
  high-intensity core, or custom.
- `Ray-march steps`: number of midpoint samples.
- `Opacity scale`: common extinction multiplier.
- `Volume size`: shared half-extent of the volume bounds.
- Each band exposes its intensity `Min`, `Max`, and `Opacity`.

## Sample Data and Rights

This module uses the **Aneurism** rotational C-arm X-ray angiography sample,
provided courtesy of **Philips Research, Hamburg, Germany**. The asset was
downloaded from the TC18 mirror documented by Teem:

- [Teem VolVis documentation](https://teem.sourceforge.net/nrrd/volvis/index.html)
- [TC18 dataset page](https://tc18.org/3D_images.html)

No standalone standard license accompanies the download. TC18 says its hosted
datasets are “supposed to be copyleft”; this is not treated here as a precise
license grant. Preserve the attribution and source record when redistributing
the asset. See `src/data/aneurism/README.md` for the exact downloaded file,
format, processing, and rights note.

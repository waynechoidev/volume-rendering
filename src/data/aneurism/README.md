# Aneurism Volume Asset

`aneurism.uint8.raw` is the decompressed Aneurism dataset distributed by
VolVis.org and mirrored by TC18. Teem documents the detached NRRD metadata.

```text
type = unsigned 8-bit integer
dimensions = 256 × 256 × 256
voxel spacing = 1:1:1
byte length = 16,777,216
memory order = x + 256 × (y + 256 × z)
```

The dataset is a rotational C-arm X-ray scan of the arteries in the right half
of a human head. Contrast agent was injected and an aneurism is present.
Courtesy of Philips Research, Hamburg, Germany.

## Source and Attribution

- Dataset: **Aneurism**
- Modality: rotational C-arm X-ray angiography
- Provider: **Philips Research, Hamburg, Germany**
- Documentation: https://teem.sourceforge.net/nrrd/volvis/index.html
- Distribution page: https://tc18.org/3D_images.html
- Download used here:
  https://tc18.org/DataSets/3D_greyscale/aneurism.raw.gz

The downloaded gzip stream was only decompressed and renamed to
`aneurism.uint8.raw`. Its voxel values and memory order were not converted.

## Rights Status

The download does not include a standalone license file or identify a standard
license such as CC BY, MIT, or GPL. The TC18 distribution page describes its
hosted datasets as “supposed to be copyleft” and asks that incorrect copyright
information be reported. That wording is not a complete license grant.

Consequently, do not claim a more specific license than the source provides.
Preserve this file, the Philips attribution, and the source URLs whenever the
raw volume is redistributed. Anyone publishing or commercially redistributing
the asset should verify the rights with the original distributor or provider.

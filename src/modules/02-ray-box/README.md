# Volume 02 — Ray Box Intersection

## Goal

A volume occupies a finite region. This stage finds the interval in which the
camera ray is inside an axis-aligned box:

\[
t\in[t_{\mathrm{near}},t_{\mathrm{far}}].
\]

Pixels that miss the box remain dark. Pixels that hit it visualize the length
of the segment inside the box.

## 1. Starting from the ray equation

A camera ray is parameterized as:

\[
\mathbf{r}(t)=\mathbf{o}+t\mathbf{d}.
\]

Here:

- \(\mathbf{r}(t)\) is the world-space position reached along the ray;
- \(\mathbf{o}\) is the ray origin, which is the camera position;
- \(\mathbf{d}\) is the normalized ray direction for the current pixel;
- \(t\) is the world-space distance traveled from the camera.

The subscript \(i\) selects one coordinate axis: \(x\), \(y\), or \(z\). For
one axis,

\[
r_i(t)=o_i+t d_i.
\]

A box with half-extent \(h\) contains points satisfying:

\[
-h\le o_i+t d_i\le h.
\]

The ray reaches the two axis-aligned planes at:

\[
t_{0,i}=\frac{-h-o_i}{d_i},
\qquad
t_{1,i}=\frac{h-o_i}{d_i}.
\]

The sign of \(d_i\) determines which plane is entered first, so the ordered
interval for one axis is:

\[
t_{\min,i}=\min(t_{0,i},t_{1,i}),
\qquad
t_{\max,i}=\max(t_{0,i},t_{1,i}).
\]

## 2. Intersecting the three slab intervals

The ray is inside the box only while it is inside the \(x\), \(y\), and \(z\)
slabs simultaneously. Intersecting intervals means taking the latest entry and
earliest exit:

\[
t_{\mathrm{near}}
=\max(t_{\min,x},t_{\min,y},t_{\min,z}),
\]

\[
t_{\mathrm{far}}
=\min(t_{\max,x},t_{\max,y},t_{\max,z}).
\]

An intersection exists when:

\[
t_{\mathrm{far}}>\max(t_{\mathrm{near}},0).
\]

The maximum with zero handles a camera located inside the box: marching then
starts at the camera rather than behind it.

## 3. Implementing `intersect_box()`

```wgsl
fn intersect_box(origin: vec3f, direction: vec3f) -> RayInterval
```

The function receives the camera position as `origin` and the normalized
pixel-ray direction as `direction`. It returns the interval:

```wgsl
struct RayInterval {
  near: f32,
  far: f32,
};
```

- `near`: the world-space distance at which the ray enters the box;
- `far`: the world-space distance at which the ray exits the box.

```text
camera
  o ----------[================]----------> direction
              near             far
              inside the volume
```

The function does not render a box surface. It determines the finite range of
\(t\) for which the ray lies inside the volume.

WGSL vector arithmetic applies the same operation to \(x\), \(y\), and \(z\),
so the three axis intervals can be calculated together:

```wgsl
fn intersect_box(origin: vec3f, direction: vec3f) -> RayInterval {
  let inverse_direction = 1.0 / direction;
  let t0 = (-vec3f(3.2) - origin) * inverse_direction;
  let t1 = (vec3f(3.2) - origin) * inverse_direction;
  let smaller = min(t0, t1);
  let larger = max(t0, t1);
  return RayInterval(
    max(max(smaller.x, smaller.y), smaller.z),
    min(min(larger.x, larger.y), larger.z),
  );
}
```

`t0` and `t1` contain the two plane-intersection distances for all three axes.
`smaller` and `larger` order each axis interval. The nested `max` selects the
latest entry distance, and the nested `min` selects the earliest exit distance.

## 4. Visualizing the interval

The distance traveled inside the volume is:

\[
L=t_{\mathrm{far}}-t_{\mathrm{entry}},
\qquad
t_{\mathrm{entry}}=\max(t_{\mathrm{near}},0).
\]

The shader maps this unbounded distance into \([0,1)\):

\[
q=1-e^{-0.28L}.
\]

```wgsl
let distance_inside = interval.far - entry;
let normalized_distance = 1.0 - exp(-distance_inside * 0.28);
```

Blue represents shorter paths near the silhouette, while orange represents
longer paths through the center. This is not volume opacity; it is only a
debug view of the integration domain.

## Code correspondence

| Mathematics | WGSL |
| --- | --- |
| \(\mathbf{o}\) | `origin` |
| \(\mathbf{d}\) | `direction` |
| \(1/\mathbf{d}\) | `inverse_direction` |
| \(t_{\mathrm{near}}\) | `interval.near` |
| \(t_{\mathrm{far}}\) | `interval.far` |
| \(L\) | `distance_inside` |

## What changed from stage 01

- Camera-ray reconstruction is unchanged.
- `intersect_box()` adds the finite integration interval.
- No density, transmittance, opacity, or lighting exists.

# 02 — Ray Box Intersection

## Goal

A volume occupies a finite region. This stage finds the interval in which the
camera ray is inside an axis-aligned box:

$$
t\in[t_{\mathrm{near}},t_{\mathrm{far}}].
$$

Pixels that miss the box remain dark. Pixels that hit it visualize the length
of the segment inside the box.

## Parameter

`Volume size` controls the box half-extent $h$. The default $h=2$ produces
a box spanning $[-2,2]$ on each axis, so its full width, height, and depth are
$2h=4$. The same default and control range are retained by every later
volume-rendering stage.

## 1. Starting from the ray equation

A camera ray is parameterized as:

$$
\mathbf{r}(t)=\mathbf{o}+t\mathbf{d}.
$$

Here:

- $\mathbf{r}(t)$ is the world-space position reached along the ray;
- $\mathbf{o}$ is the ray origin, which is the camera position;
- $\mathbf{d}$ is the normalized ray direction for the current pixel;
- $t$ is the world-space distance traveled from the camera.

The subscript $i$ selects one coordinate axis: $x$, $y$, or $z$. For
one axis,

$$
r_i(t)=o_i+t d_i.
$$

A box with half-extent $h$ contains points satisfying:

$$
-h\le o_i+t d_i\le h.
$$

The ray reaches the two axis-aligned planes at:

$$
t_{0,i}=\frac{-h-o_i}{d_i},
\qquad
t_{1,i}=\frac{h-o_i}{d_i}.
$$

![The two plane intersections and the slab interval for one axis](./axis-slab-interval.svg)

The yellow points are where the ray intersects the `i = -h` and `i = +h`
planes. Only between them does the ray coordinate on axis $i$ satisfy the
slab condition.

The sign of $d_i$ determines which plane is entered first, so the ordered
interval for one axis is:

$$
t_{\min,i}=\min(t_{0,i},t_{1,i}),
\qquad
t_{\max,i}=\max(t_{0,i},t_{1,i}).
$$

Here, $t_{0,i}$ and $t_{1,i}$ are the **two intersection points** where the
ray meets the two planes that bound the slab for axis $i$. An interval is not
one intersection point. It is the region **between those two points**, from
where the ray enters the slab until it leaves:

The slab interval for one axis is therefore:

$$
t\in[t_{\min,i},t_{\max,i}].
$$

## 2. Intersecting the three slab intervals

The ray is inside the box only while it is inside the $x$, $y$, and $z$
slabs simultaneously. Intersecting intervals means taking the latest entry and
earliest exit:

A slab is not an axis itself. It is the infinite region between two parallel
planes:

The three slabs contain the points satisfying $-h\le x\le h$,
$-h\le y\le h$, and $-h\le z\le h$, respectively. The box is the
intersection of those three regions.

![Three axis-aligned slabs overlapping to form a 3D box](./slab-intersection.svg)

The space between the two translucent red planes is the x slab, the space
between the green planes is the y slab, and the space between the blue planes
is the z slab. Their common region is the 3D box. The white ray enters that
common region at `t_near` and exits it at `t_far`.

Restricting this 3D problem to one particular ray turns each slab into a 1D
interval of $t$ values. Suppose those intervals are:

![The overlapping t intervals of the three slabs](./slab-intervals.svg)

At `t = 3`, the ray is inside the x and z slabs but not yet inside the y slab.
At `t = 5`, it is inside all three slabs and therefore inside the box. At
`t = 8`, it has already left the z slab and is outside the box.

The box interval therefore begins at the latest of the three starts and ends at
the earliest of the three ends:

$$
[2,10]\cap[4,8]\cap[3,7]=[4,7].
$$

Therefore, `t_near = max(2, 4, 3) = 4` and
`t_far = min(10, 8, 7) = 7`.

This is what intersecting the three intervals means. Instead of finding the
overlap of three slabs directly in 3D, the algorithm finds where their three
$t$ intervals overlap along this one ray.

$$
t_{\mathrm{near}}
=\max(t_{\min,x},t_{\min,y},t_{\min,z}),
$$

$$
t_{\mathrm{far}}
=\min(t_{\max,x},t_{\max,y},t_{\max,z}).
$$

An intersection exists when:

$$
t_{\mathrm{far}}>\max(t_{\mathrm{near}},0).
$$

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

The function does not render a box surface. It determines the finite range of
$t$ for which the ray lies inside the volume.

In the theory above, $i$ denotes one axis at a time. The implementation packs
the three applications of the same equation into vector components:

$$
\mathbf{t}_0=(t_{0,x},t_{0,y},t_{0,z}),
\qquad
\mathbf{t}_1=(t_{1,x},t_{1,y},t_{1,z}).
$$

WGSL vector arithmetic and vector `min()` and `max()` operate component by
component. Therefore:

```wgsl
let t0 = (box_min - origin) * inverse_direction;
```

is equivalent to:

| Component | Scalar equation evaluated at the same time |
| --- | --- |
| `t0.x` | `(box_min.x - origin.x) / direction.x` |
| `t0.y` | `(box_min.y - origin.y) / direction.y` |
| `t0.z` | `(box_min.z - origin.z) / direction.z` |

These components are not the coordinates of a 3D position. They are three
different ray parameters $t$: one for reaching the `box_min` plane of each
axis. `t1` similarly contains the three parameters for reaching the
`box_max` planes.

Component-wise `min()` and `max()` produce:

$$
\mathbf{t}_{\mathrm{axis\_near}}
=\min(\mathbf{t}_0,\mathbf{t}_1),
\qquad
\mathbf{t}_{\mathrm{axis\_far}}
=\max(\mathbf{t}_0,\mathbf{t}_1).
$$

| Component | `axis_near` | `axis_far` |
| --- | --- | --- |
| `.x` | entry $t$ for the x slab | exit $t$ for the x slab |
| `.y` | entry $t$ for the y slab | exit $t$ for the y slab |
| `.z` | entry $t$ for the z slab | exit $t$ for the z slab |

The latest component of `axis_near` becomes the box `near`, and the earliest
component of `axis_far` becomes the box `far`. This is exactly the
three-interval intersection derived in section 2.

```wgsl
fn intersect_box(origin: vec3f, direction: vec3f) -> RayInterval {
  let half_extent = params.half_extent;
  let box_min = vec3f(-half_extent);
  let box_max = vec3f(half_extent);
  let inverse_direction = 1.0 / direction;
  let t0 = (box_min - origin) * inverse_direction;
  let t1 = (box_max - origin) * inverse_direction;
  let axis_near = min(t0, t1);
  let axis_far = max(t0, t1);
  return RayInterval(
    max(max(axis_near.x, axis_near.y), axis_near.z),
    min(min(axis_far.x, axis_far.y), axis_far.z),
  );
}
```

The code is therefore not a separate formula. It is the per-axis plane
intersection from section 1 and the interval intersection from section 2,
packed into WGSL vector operations.

## 4. Visualizing the interval

The distance traveled inside the volume is:

$$
L=t_{\mathrm{far}}-t_{\mathrm{entry}},
\qquad
t_{\mathrm{entry}}=\max(t_{\mathrm{near}},0).
$$

The shader maps this unbounded distance into $[0,1)$:

$$
q=1-e^{-0.28L}.
$$

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
| $\mathbf{o}$ | `origin` |
| $\mathbf{d}$ | `direction` |
| $1/\mathbf{d}$ | `inverse_direction` |
| $t_{\mathrm{near}}$ | `interval.near` |
| $t_{\mathrm{far}}$ | `interval.far` |
| $L$ | `distance_inside` |

## What changed from stage 01

- Camera-ray reconstruction is unchanged.
- `intersect_box()` adds the finite integration interval.
- No density, transmittance, opacity, or lighting exists.

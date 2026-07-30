# Volume 02 — Ray Box Intersection

## Goal

volume은 유한한 영역을 차지합니다. 이 단계는 camera ray가 축 정렬
상자(axis-aligned box) 내부에 있는 구간을 구합니다.

\[
t\in[t_{\mathrm{near}},t_{\mathrm{far}}].
\]

box를 통과하지 않는 pixel은 어둡게 남고, 교차한 pixel은 box 내부 segment
길이를 color로 보여줍니다.

## 1. Starting from the ray equation

camera ray는 다음과 같이 매개변수화(parameterization)됩니다.

\[
\mathbf{r}(t)=\mathbf{o}+t\mathbf{d}.
\]

- \(\mathbf{r}(t)\): ray를 따라 도달한 world-space position
- \(\mathbf{o}\): camera position인 ray origin
- \(\mathbf{d}\): 현재 pixel의 정규화된 ray direction(normalized ray direction)
- \(t\): camera에서 이동한 world-space distance

아래첨자 \(i\)는 \(x,y,z\) 중 하나의 coordinate axis를 선택합니다.

\[
r_i(t)=o_i+t d_i.
\]

중심에서 한쪽 면까지의 거리(half-extent)가 \(h\)인 box 내부의 점은 다음
조건을 만족합니다.

\[
-h\le o_i+t d_i\le h.
\]

ray가 축에 정렬된 두 plane에 도달하는 값은 다음과 같습니다.

\[
t_{0,i}=\frac{-h-o_i}{d_i},
\qquad
t_{1,i}=\frac{h-o_i}{d_i}.
\]

\(d_i\)의 부호에 따라 먼저 만나는 plane이 달라지므로 한 축의 interval을
정렬합니다.

\[
t_{\min,i}=\min(t_{0,i},t_{1,i}),
\qquad
t_{\max,i}=\max(t_{0,i},t_{1,i}).
\]

## 2. Intersecting the three slab intervals

ray가 box 내부에 있으려면 \(x,y,z\) 슬랩(slab) 안에 동시에 있어야 합니다.
구간 교집합(interval intersection)은 가장 늦은 진입점(entry)과 가장 이른
이탈점(exit)을 선택합니다.

\[
t_{\mathrm{near}}
=\max(t_{\min,x},t_{\min,y},t_{\min,z}),
\]

\[
t_{\mathrm{far}}
=\min(t_{\max,x},t_{\max,y},t_{\max,z}).
\]

다음 조건이면 intersection이 존재합니다.

\[
t_{\mathrm{far}}>\max(t_{\mathrm{near}},0).
\]

0과의 `max`는 camera가 box 내부에 있을 때 ray가 camera 뒤쪽이 아니라
camera position에서 시작하게 합니다.

## 3. Implementing `intersect_box()`

```wgsl
fn intersect_box(origin: vec3f, direction: vec3f) -> RayInterval
```

함수는 camera position을 `origin`, 정규화된 pixel-ray direction(normalized
pixel-ray direction)을
`direction`으로 받고 다음 interval을 반환합니다.

```wgsl
struct RayInterval {
  near: f32,
  far: f32,
};
```

- `near`: ray가 box에 진입하는 world-space distance
- `far`: ray가 box에서 나오는 world-space distance

```text
camera
  o ----------[================]----------> direction
              near             far
              inside the volume
```

이 함수는 box surface를 rendering하지 않습니다. ray가 volume 내부에 있는
유한한 \(t\) 범위를 결정합니다.

WGSL 벡터 연산(vector arithmetic)을 이용하면 세 axis interval을 함께 계산할 수 있습니다.

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

`t0`, `t1`에는 세 axis의 두 평면 교차 거리(plane-intersection distance)가 들어 있습니다.
`smaller`, `larger`는 각 interval을 정렬합니다. 중첩 `max`는 가장 늦은
entry를, 중첩 `min`은 가장 이른 exit를 선택합니다.

## 4. Visualizing the interval

volume 내부에서 이동한 거리는 다음과 같습니다.

\[
L=t_{\mathrm{far}}-t_{\mathrm{entry}},
\qquad
t_{\mathrm{entry}}=\max(t_{\mathrm{near}},0).
\]

shader는 제한이 없는 distance를 \([0,1)\)로 mapping합니다.

\[
q=1-e^{-0.28L}.
\]

```wgsl
let distance_inside = interval.far - entry;
let normalized_distance = 1.0 - exp(-distance_inside * 0.28);
```

윤곽선(silhouette) 부근의 짧은 path는 파란색, 중앙의 긴 path는 주황색으로
표시됩니다. 이것은 volume opacity가 아니라 적분 구간(integration domain)의 debug
view입니다.

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

- camera-ray reconstruction은 그대로입니다.
- `intersect_box()`가 유한한 적분 구간(integration interval)을 추가합니다.
- density, 투과율(transmittance), 불투명도(opacity), lighting은 아직 없습니다.

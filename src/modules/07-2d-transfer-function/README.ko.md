# 07 — Aneurism 2D Transfer Function

이번 chapter는 classic Aneurism volume에 2D transfer function을
적용합니다. 오른쪽 머리 절반의 동맥을 촬영한 contrast-enhanced rotational
C-arm X-ray scan이며 aneurism이 포함되어 있습니다. Philips Research,
Hamburg, Germany에서 제공했습니다.

stage 06과 같은 unsigned 8-bit $256^3$ isotropic Aneurism volume을
사용합니다. dataset과 ray marcher를 그대로 유지하고 transfer-function
domain만 1D intensity에서 2D intensity–gradient로 확장하므로 두 방식의
차이를 직접 비교할 수 있습니다.

## 1. Volume Representation

volume은:

$$
256^3=16{,}777{,}216
$$

개의 sample과 $1:1:1$ spacing을 가집니다. raw file의 voxel index는:

$$
i=x+256(y+256z).
$$

byte 값을 변환하지 않고 filterable `r8unorm` 3D texture에 upload합니다.
texture sampling 결과는 $[0,1]$이므로 shader에서 source domain으로
복원합니다.

$$
v=255\,\operatorname{textureSample}(\mathbf{u}).
$$

세 축의 spacing이 같으므로 world volume은 cube이며 slice 축 scale 보정이
필요하지 않습니다.

## 2. 2D Transfer Function이 필요한 이유

조영제가 채워진 혈관은 밝지만 intensity 하나만으로는 가는 혈관 경계와
비슷한 값을 가진 내부를 구분하기 어렵습니다. classifier는 다음 두 값을
사용합니다.

$$
\tau(v,g):(v,g)\longmapsto(\mathbf{c},\sigma),
\qquad
g=\|\nabla v\|.
$$

가로축 $v$는 source intensity를 선택하고 세로축 $g$는 주변 voxel에서
intensity가 얼마나 빠르게 변하는지 선택합니다. dense한 혈관 내부는 보통
높은 intensity와 낮은 gradient를 가지며 혈관 벽은 더 강한 gradient를
가집니다.

## 3. Gradient Preprocessing

setup에서 compute shader가 central difference를 계산합니다.

$$
v_x\approx\frac{v(x+1,y,z)-v(x-1,y,z)}{2},
$$

$$
v_y\approx\frac{v(x,y+1,z)-v(x,y-1,z)}{2},
\qquad
v_z\approx\frac{v(x,y,z+1)-v(x,y,z-1)}{2}.
$$

isotropic spacing이므로 모든 분모는 2입니다. gradient magnitude와
direction은:

$$
g=\sqrt{v_x^2+v_y^2+v_z^2},
\qquad
\mathbf{n}=\frac{\nabla v}{\max(g,\epsilon)}.
$$

`4×4×4` compute workgroup이 `rgba8unorm` 3D texture에 저장합니다.

$$
\text{RGB}=\frac{\mathbf{n}}2+\frac12,
\qquad
A=\operatorname{clamp}\left(\frac{g}{128},0,1\right).
$$

미리 계산하므로 ray-march sample마다 intensity 이웃을 6번 추가로 읽지
않아도 됩니다.

## 4. Joint Histogram

editor는 다음을 표시합니다.

$$
H(i,j)=\#\{\mathbf{x}\mid v(\mathbf{x})\in I_i,\,
g(\mathbf{x})\in G_j\}.
$$

- 가로축: intensity $0\ldots255$
- 세로축: gradient magnitude $0\ldots128$
- 밝기: 0이 아닌 voxel 개수의 log 값

sparse한 혈관 구조가 보이도록 UI histogram에서는 값이 0인 background
voxel을 제외합니다. rendering은 전체 volume을 그대로 sampling합니다.

기본 editable region은:

| Region | Intensity | Gradient | 목적 |
| --- | ---: | ---: | --- |
| Vessel boundary | 18–210 | 4–105 | 붉은 혈관 벽과 가지 |
| Dense vessel core | 145–255 | 0–72 | 밝은 조영 혈관 내부 |

visualization 시작점이며 임상 segmentation이 아닙니다.

## 5. Region Classification

구간 $[a,b]$에는 feather가 있는 range weight를 사용합니다.

$$
R(x;a,b)=R_{\min}(x)R_{\max}(x).
$$

아래쪽 factor는 `smoothstep`으로 증가하고 위쪽 factor는 $b$ 근처에서
감소합니다. region이 0이나 domain maximum에 닿으면 해당 edge를 열어 두어
정확히 0 또는 255인 값이 사라지지 않게 합니다.

2D region은 두 coordinate weight를 곱합니다.

$$
w_m(v,g)=
R(v;v_{m,0},v_{m,1})
R(g;g_{m,0},g_{m,1}).
$$

color와 extinction은:

$$
\mathbf{c}=
\frac{w_v\mathbf{c}_v+w_c\mathbf{c}_c}
{\max(w_v+w_c,\epsilon)},
\qquad
\sigma=k(a_vw_v+a_cw_c).
$$

UI extinction은 임의의 world unit이 아니라 voxel 하나를 기준으로
정의합니다. 따라서 world-space step을 voxel distance로 변환합니다.

$$
\delta_{\mathrm{voxel}}=
\delta_{\mathrm{world}}
\frac{N_x}{2h_x}.
$$

ray marcher는 extinction을 step opacity로 변환합니다.

$$
\alpha_i=1-\exp(-\sigma_i\delta_{\mathrm{voxel}}).
$$

그다음 stage 04에서 유도한 front-to-back 합성(compositing) 방정식을 그대로
사용합니다. 이 정규화로 world volume 크기나 ray-march sample 수가 바뀌어도
opacity control의 의미가 유지됩니다.

gradient RGB는 작은 ambient-plus-diffuse 항에 사용할 normal도 제공합니다.
classification이나 opacity를 바꾸지 않고 국소 대비를 추가하여 굽은 혈관이
균일한 색의 안개처럼 보이지 않게 합니다.

## Parameters

- `Transfer preset`: boundary와 core 모두, vessel boundary만, dense core만,
  또는 custom
- `Ray-march steps`: desktop 448, 작은 화면 288
- `Opacity scale`: 공통 extinction multiplier
- `Volume size`: volume bounds의 공통 half-extent
- `I min/max`: 선택한 source-intensity 구간
- `G min/max`: 선택한 gradient-magnitude 구간
- `Opacity`: 선택한 region의 extinction 세기

## Limitations

- classification은 visualization 목적이며 진단용이 아닙니다.
- gradient direction과 magnitude는 `rgba8unorm`으로 양자화됩니다.
- UI histogram은 두 칸마다 sampling하고 rendering은 full resolution을
  사용합니다.
- 아직 lighting을 적용하지 않지만 이후 chapter를 위해 RGB normal을
  보존합니다.

## Sample Data와 권리 정보

Teem 문서는 format과 Philips attribution을 기록합니다. 현재 asset은 TC18
mirror에서 받았습니다.

- [Teem VolVis instructions](https://teem.sourceforge.net/nrrd/volvis/index.html)
- [TC18 dataset mirror](https://tc18.org/3D_images.html)

이 sample은 **Philips Research, Hamburg, Germany**에서 제공했습니다.
download에는 별도의 표준 license file이 없으며, TC18의 “supposed to be
copyleft”라는 설명은 구체적인 license 허가로 간주하지 않습니다. volume을
재배포할 때 attribution과 `src/data/aneurism/README.md`를 함께 유지해야
합니다.

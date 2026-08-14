# 06 — Aneurism 1D Transfer Function

이 장에서는 Aneurism 혈관조영(angiography) volume을 1D transfer function으로
rendering합니다. intensity만 사용하는 기준 구현이며, 07장에서는 여기에
gradient magnitude를 추가합니다.

$256^3$ unsigned 8-bit isotropic dataset은 `src/data/aneurism/`에 한 번만
두고 두 장이 공유합니다. Philips Research, Hamburg, Germany에서 제공한
자료입니다. voxel의 99% 이상은 0이며, 0이 아닌 값은 주로 조영제가 채워진
혈관 구조를 나타냅니다.

## 1. Scalar Intensity

raw file에서 voxel $(x,y,z)$의 위치는:

$$
i=x+256(y+256z).
$$

원본 byte를 filterable `r8unorm` 3D texture에 그대로 upload합니다. texture
sampling 결과는 정규화되어 있으므로 원본 intensity는:

$$
v=255\,\operatorname{textureSample}(\mathbf u).
$$

## 2. 1D Transfer Function

transfer function은 intensity $v$ 하나를 방출 color $\mathbf c$와
extinction $\sigma$로 변환합니다.

$$
\tau(v):v\longmapsto(\mathbf c,\sigma).
$$

editor는 실제 intensity histogram과 편집 가능한 band 두 개를 표시합니다.

| Band | Intensity | 목적 |
| --- | ---: | --- |
| Vessels | 18–180 | 넓은 범위의 붉은 혈관 구조 |
| Dense core | 145–255 | 밝은 고강도 내부 |

부드러운 범위 weight를 $R(v;a,b)$라고 하면 sample 값은:

$$
\mathbf c(v)=
\frac{w_v\mathbf c_v+w_c\mathbf c_c}
{\max(w_v+w_c,\epsilon)},
\qquad
\sigma(v)=k(a_vw_v+a_cw_c).
$$

여기서 $w_v=R(v;v_0,v_1)$, $w_c=R(v;c_0,c_1)$이고, $a_v,a_c$는
band opacity, $k$는 전체 opacity scale입니다.

## 3. Rendering

ray marcher는 world-space step을 voxel distance로 바꿉니다.

$$
\delta_{\mathrm{voxel}}=
\delta_{\mathrm{world}}\frac{256}{2h_x}.
$$

Beer–Lambert 감쇠(attenuation)로 sample 하나의 opacity를 구합니다.

$$
\alpha_i=1-\exp(-\sigma_i\delta_{\mathrm{voxel}}).
$$

그다음 04장에서 유도한 front-to-back 합성으로 sample을 누적합니다. 이
단계에는 gradient texture와 lighting이 없습니다. 따라서 vessel 경계와
내부에 있는 voxel의 intensity가 같다면 둘을 동일하게 분류합니다. 이
모호함이 바로 07장의 2D transfer function이 해결하려는 문제입니다.

## Parameters

- `Transfer preset`: 두 intensity band 모두, 넓은 vessel band만,
  high-intensity core만, 또는 custom 상태를 선택합니다.
- `Ray-march steps`: 중점 sample 개수입니다.
- `Opacity scale`: 공통 extinction 배수입니다.
- `Volume size`: volume bounds의 공통 half-extent입니다.
- 각 band에는 intensity `Min`, `Max`, `Opacity`가 있습니다.

## Sample Data와 권리 정보

이 모듈은 **Philips Research, Hamburg, Germany**에서 제공한 **Aneurism**
rotational C-arm X-ray angiography sample을 사용합니다. Teem이 문서화한
TC18 mirror에서 받았습니다.

- [Teem VolVis 문서](https://teem.sourceforge.net/nrrd/volvis/index.html)
- [TC18 dataset 페이지](https://tc18.org/3D_images.html)

download에는 별도의 표준 license file이 없습니다. TC18은 hosted dataset을
“supposed to be copyleft”라고 설명하지만, 이를 구체적인 license 허가로
간주해서는 안 됩니다. asset을 재배포할 때 제공자 attribution과 출처 기록을
유지해야 합니다. 정확한 download file, format, 처리 과정, 권리 관련 주의사항은
`src/data/aneurism/README.md`에 기록되어 있습니다.

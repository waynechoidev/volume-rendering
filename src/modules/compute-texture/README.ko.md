# Compute Texture

compute-to-render workflow를 보여주는 예제입니다. compute shader가
animation되는 절차적 이미지를 storage texture에 기록하고, render pass가
그 texture를 fullscreen triangle에 sampling합니다.

## Compute pass

출력 texture는 `rgba8unorm` 형식을 사용하며 현재 drawing buffer 크기에
맞춰 다시 생성됩니다. 각 compute invocation은 texel 하나를 기록합니다.
\(8\times8\) workgroup을 사용할 때 dispatch 크기는 다음과 같습니다.

\[
N_x=\left\lceil\frac{W}{8}\right\rceil,\qquad
N_y=\left\lceil\frac{H}{8}\right\rceil
\]

shader의 경계 검사는 texture 범위를 벗어난 invocation을 제외합니다.

## Render pass

render shader는 `vertex_index`로 fullscreen triangle을 생성하고 compute
출력을 sampled texture로 읽습니다. 두 pass 사이에서 texture는 GPU에 계속
유지되며 CPU로 읽어오지 않습니다.

## Parameters

- `Pattern scale`: 생성되는 패턴의 공간 주파수
- `Animation speed`: 시간에 따른 움직임의 속도
- `Contrast`: 최종 패턴의 대비 강도

## Files

- `ComputeTextureModule.ts`: parameter, resource, compute-to-screen pass 순서
- `compute-texture.compute.wgsl`: 절차적 storage texture 생성
- `../../engine/shaders/fullscreen.vertex.wgsl`: 엔진이 캐시하는 fullscreen
  triangle shader
- `compute-texture.fragment.wgsl`: compute 결과 texture 출력
- `dispatch.ts`: workgroup dispatch 크기 계산
- `dispatch.test.ts`: dispatch 크기 검증

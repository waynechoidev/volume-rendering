# Volume Rendering

## Abstract

이 프로젝트는 camera ray의 기초(foundation)부터 lighting이 적용된 3D density
field까지 WebGPU volume renderer를 단계적으로 구현합니다. renderer는
screen pixel마다 world-space ray를 복원하고, 유한한 volume으로 범위를
제한하고, 해당 구간(interval)을 따라 density를 sampling한 뒤 이산(discrete)
volume rendering equation으로 color와 투과율(transmittance)을 누적합니다.

최종 결과는 연결된 cloud 형태의 density field를 3D texture에 저장합니다.
density 기울기(gradient)가 국소 형태 단서(local shape cue)를 만들고, light
방향의 보조 march(secondary march)가 자체 그림자(self-shadowing)를
추정합니다. ray 생성(construction), 교차 판정(intersection), density
표현(representation), 적분(integration), lighting을 각각 확인하고 수정할 수 있도록
구현 단계를 명시적으로 유지합니다.

## Implementation Steps

### 01 — Camera Rays

fullscreen UV coordinate를 world-space ray로 변환합니다. camera의 역
view-projection 행렬(inverse view-projection matrix)로 far plane의 점을
복원하고, camera에서 해당 점으로 향하는 정규화된 벡터(normalized vector)를
ray direction으로 사용합니다. 검증을 위해
direction을 RGB로 표시합니다.

### 02 — Ray Box Intersection

슬랩 방법(slab method)으로 각 camera ray와 축 정렬 상자(axis-aligned box)를
교차합니다. 결과는 sample
position이 유한한 volume 내부에 존재하는 ray의 near/far distance입니다.

### 03 — Homogeneous Medium

경계가 정해진 구간(bounded interval)을 일정한(constant) density로 채웁니다.
Beer–Lambert 감쇠(attenuation)의 해석적 투과율(analytic transmittance)과
불투명도(opacity)를 통해 sampling loop 없이 소멸(extinction)의 물리적
의미를 확인합니다.

### 04 — Discrete Rendering

density가 공간에 따라 변하도록 만들고 ray interval을 짧은 segment로
나눕니다. 중점 sample(midpoint sample)을 앞에서 뒤 순서(front-to-back)로
누적하면서 segment 불투명도(opacity)와 각 sample에 도달한
투과율(transmittance)을 적용합니다.

### 05 — Density Texture

scalar density field를 filterable 3D texture로 옮깁니다. world-space sample
position을 texture coordinate로 mapping하고 삼선형 필터링(trilinear filtering)으로 voxel
사이의 연속적인 density를 추정합니다.

### 06 — Density Lighting

density 기울기(gradient)로 국소 의사 법선(local pseudo-normal)을 추정하고
light 방향으로 짧은 보조 ray(secondary ray)를 march하여 광학적
깊이(optical depth)와 자체 그림자(self-shadowing)를 근사합니다.
camera ray의 합성 방정식(compositing equation)은 유지하면서 연결된 density field에
shading을 추가합니다.

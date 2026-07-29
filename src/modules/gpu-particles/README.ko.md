# GPU Particles

대규모 particle system을 GPU에서만 simulation하고 rendering하는 모듈입니다.
particle은 중심 중력장을 공전하며 다채로운 black-hole 강착 흐름과 비슷한 형태를
만듭니다.

## Particle state

각 particle은 위치와 속도를 storage buffer에 저장합니다. 같은 크기의
buffer 두 개를 ping-pong 구조로 사용합니다.

```text
frame n:     A -> compute -> B -> render
frame n + 1: B -> compute -> A -> render
```

따라서 particle 상태를 CPU로 복사할 필요가 없습니다.

## Simulation

particle 위치 \(\mathbf{x}\)에 대해 원점 방향의 가속도는 역제곱 중력을
기반으로 계산합니다.

\[
\mathbf{a}=
-G\frac{\mathbf{x}}{\left(\|\mathbf{x}\|^2+\epsilon\right)^{3/2}}
\]

완화항 \(\epsilon\)은 중심 부근의 불안정한 특이점을 방지합니다. compute
pass는 workgroup 하나당 particle 256개를 처리합니다.

\[
N=\left\lceil\frac{\text{particleCount}}{256}\right\rceil
\]

## Rendering

각 particle은 instancing을 이용해 camera를 향하는 6-vertex quad로
rendering됩니다. vertex shader는 가장 최근 simulation buffer에서 particle
상태를 직접 읽습니다. additive color blending으로 particle이 겹치는 영역에
밝은 궤적을 만듭니다.

## Parameters

- `Particle count`: simulation하고 rendering할 particle 수
- `Black hole mass`: 중력의 세기
- `Simulation speed`: 적분에 적용하는 시간 배율
- `Bounds`: particle을 초기화하는 공간 경계
- `Point size`: rendering되는 particle 크기
- `Reset particles`: 결정론적인 초기 상태를 다시 생성

desktop 기본값은 particle 131,072개입니다. coarse pointer 장치에서는 GPU
메모리와 compute 부하를 줄이기 위해 32,768개를 기본값으로 사용합니다.

## Files

- `GPUParticleModule.ts`: particle 실행 구성과 control
- `ParticleSimulation.ts`: compute pipeline과 ping-pong storage buffer
- `ParticleRenderer.ts`: instanced rendering과 depth resource
- `particle.compute.wgsl`: particle 적분
- `particle.vertex.wgsl`: billboard 생성과 particle 색상
- `particle.fragment.wgsl`: 원형 particle coverage와 blending 출력
- `particle-data.ts`: 결정론적인 초기 상태
- `particle-data.test.ts`: particle layout과 초기화 테스트

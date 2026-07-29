# Compute Circle

최소한의 compute-to-render pipeline을 보여주는 예제입니다.

## Pipeline

1. compute shader가 화면 크기의 `rgba8unorm` storage texture에
   anti-aliased 원을 기록합니다.
2. 전체 화면 삼각형에서 fragment shader를 실행합니다.
3. fragment shader가 compute 결과 texture를 읽어 canvas에 출력합니다.

viewport 크기가 바뀌면 texture를 자동으로 다시 생성합니다. compute
dispatch는 8 × 8 workgroup을 사용합니다.

```ts
[
  Math.ceil(width / 8),
  Math.ceil(height / 8),
]
```

compute shader는 texture의 화면 비율로 가로 좌표를 보정합니다. 따라서
세로 화면과 가로 화면 모두에서 부호 거리장으로 생성한 모양이 원으로
유지됩니다.

## Files

- `ComputeCircleModule.ts`: resource와 compute-to-screen pass 실행 순서
- `compute-circle.compute.wgsl`: storage texture에 원 생성
- `../../engine/shaders/fullscreen.vertex.wgsl`: 엔진이 캐시하는 fullscreen
  triangle shader
- `compute-circle.fragment.wgsl`: compute 결과 texture 출력

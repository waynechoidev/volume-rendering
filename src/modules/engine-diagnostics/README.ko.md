# Engine Diagnostics

엔진이 제공하는 재사용 가능한 3D rendering 기능을 검증하는 예제입니다.
공용 camera uniform buffer를 사용해 기준 grid 위에 색상이 있는 cube를
그립니다.

## Rendering

cube는 back-face culling을 적용한 triangle-list pipeline을 사용합니다.
grid는 별도의 line-list pipeline을 사용합니다. 두 pipeline은 같은 shader,
vertex layout, camera bind group, `depth24plus` depth attachment를
공유합니다.

각 vertex는 다음 데이터를 저장합니다.

```text
position: float32x3
color:    float32x3
```

vertex shader는 camera의 View-Projection 행렬로 world space의 점을
변환합니다.

\[
\mathbf{p}_{clip}=VP\,\mathbf{p}_{world}
\]

drawing buffer 크기가 변경되면 depth texture를 다시 생성합니다.

## Parameters

- `Enabled`: 모든 진단 지오메트리를 활성화하거나 비활성화합니다.
- `Show cube`: 솔리드 큐브 표시 여부를 제어합니다.
- `Show grid`: 기준 격자 표시 여부를 제어합니다.

## Files

- `EngineDiagnosticsModule.ts`: 진단 pipeline, resource, control, 실행 코드
- `diagnostics.vertex.wgsl`: camera 좌표 변환
- `diagnostics.fragment.wgsl`: vertex 색상 rendering
- `../../engine/geometry/ColoredGeometry.ts`: 재사용 가능한 cube와 grid 생성

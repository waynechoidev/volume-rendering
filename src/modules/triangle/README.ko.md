# Triangle

엔진에서 가장 작은 rendering 예제입니다. WebGPU 초기화, shader 컴파일,
render pipeline 생성, 명령 인코딩, canvas 출력을 검증합니다.

## Rendering

vertex shader가 `vertex_index`로 세 vertex를 생성하므로 vertex buffer가
필요하지 않습니다. 한 번의 draw call로 삼각형 하나를 rendering합니다.

```ts
renderPass.draw(3);
```

fragment shader는 삼각형 내부에서 보간된 vertex 색상을 출력합니다.

위치는 clip space에 직접 기록됩니다. 최소한의 rendering 경로만 보여주기
위해 uniform buffer와 화면 비율 보정은 의도적으로 사용하지 않습니다.

## Files

- `TriangleModule.ts`: vertex shader, fragment shader, render pass 구성
- `triangle.vertex.wgsl`: 절차적으로 생성하는 삼각형 vertex
- `triangle.fragment.wgsl`: 보간된 fragment 색상 출력

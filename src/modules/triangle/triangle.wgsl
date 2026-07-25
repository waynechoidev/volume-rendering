struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f,
};

struct CanvasUniforms {
  clip_scale: vec2f,
};

@group(0) @binding(0) var<uniform> canvas: CanvasUniforms;

@vertex
fn vertex_main(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
  let positions = array(
    vec2f(0.0, 0.68),
    vec2f(-0.62, -0.46),
    vec2f(0.62, -0.46),
  );

  let colors = array(
    vec3f(0.30, 0.92, 1.00),
    vec3f(0.48, 0.32, 1.00),
    vec3f(1.00, 0.27, 0.57),
  );

  var output: VertexOutput;
  output.position = vec4f(positions[vertex_index] * canvas.clip_scale, 0.0, 1.0);
  output.color = colors[vertex_index];
  return output;
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
  return vec4f(input.color, 1.0);
}

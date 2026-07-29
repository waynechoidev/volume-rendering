struct CameraUniforms {
  view_projection: mat4x4f,
  inverse_view_projection: mat4x4f,
  position: vec4f,
};

struct VertexInput {
  @location(0) position: vec3f,
  @location(1) color: vec3f,
};

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f,
};

@group(0) @binding(0) var<uniform> camera: CameraUniforms;

@vertex
fn main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  output.position = camera.view_projection * vec4f(input.position, 1.0);
  output.color = input.color;
  return output;
}

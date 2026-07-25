@group(0) @binding(0)
var computed_texture: texture_2d<f32>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vertex_main(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
  let positions = array(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0),
  );

  let position = positions[vertex_index];
  var output: VertexOutput;
  output.position = vec4f(position, 0.0, 1.0);
  output.uv = position * vec2f(0.5, -0.5) + 0.5;
  return output;
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
  let dimensions = vec2f(textureDimensions(computed_texture));
  let coordinate = vec2i(
    clamp(input.uv * dimensions, vec2f(0.0), dimensions - 1.0),
  );
  return textureLoad(computed_texture, coordinate, 0);
}

@group(0) @binding(0)
var computed_texture: texture_2d<f32>;

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let dimensions = vec2f(textureDimensions(computed_texture));
  let coordinate = vec2i(
    clamp(uv * dimensions, vec2f(0.0), dimensions - 1.0),
  );
  return textureLoad(computed_texture, coordinate, 0);
}

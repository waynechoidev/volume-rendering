@group(0) @binding(0)
var computed_texture: texture_2d<f32>;

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let dimensions = textureDimensions(computed_texture);
  let coordinates = vec2i(uv * vec2f(dimensions));
  return textureLoad(computed_texture, coordinates, 0);
}

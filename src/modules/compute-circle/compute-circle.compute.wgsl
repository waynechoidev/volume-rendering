@group(0) @binding(0)
var output_texture: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let dimensions = textureDimensions(output_texture);
  if (id.x >= dimensions.x || id.y >= dimensions.y) {
    return;
  }

  let size = vec2f(dimensions);
  var position = (vec2f(id.xy) + 0.5) / size * 2.0 - 1.0;
  position.x *= size.x / size.y;

  let distance_to_circle = length(position) - 0.55;
  let pixel_width = 2.0 / min(size.x, size.y);
  let coverage =
    1.0 - smoothstep(-pixel_width, pixel_width, distance_to_circle);
  let background = vec3f(0.015, 0.022, 0.045);
  let circle = vec3f(0.18, 0.78, 1.0);
  let color = mix(background, circle, coverage);

  textureStore(output_texture, id.xy, vec4f(color, 1.0));
}

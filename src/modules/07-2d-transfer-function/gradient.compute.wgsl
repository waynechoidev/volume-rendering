@group(0) @binding(0) var intensity_texture: texture_3d<f32>;
@group(0) @binding(1)
var gradient_texture: texture_storage_3d<rgba8unorm, write>;

fn load_intensity(coordinate: vec3i, dimensions: vec3i) -> f32 {
  return textureLoad(
    intensity_texture,
    clamp(coordinate, vec3i(0), dimensions - vec3i(1)),
    0,
  ).r * 255.0;
}

@compute @workgroup_size(4, 4, 4)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let dimensions = vec3i(textureDimensions(intensity_texture));
  let coordinate = vec3i(id);
  if (any(coordinate >= dimensions)) {
    return;
  }

  let dx = 0.5 * (
    load_intensity(coordinate + vec3i(1, 0, 0), dimensions) -
    load_intensity(coordinate - vec3i(1, 0, 0), dimensions)
  );
  let dy = 0.5 * (
    load_intensity(coordinate + vec3i(0, 1, 0), dimensions) -
    load_intensity(coordinate - vec3i(0, 1, 0), dimensions)
  );
  let dz = 0.5 * (
    load_intensity(coordinate + vec3i(0, 0, 1), dimensions) -
    load_intensity(coordinate - vec3i(0, 0, 1), dimensions)
  );
  let gradient = vec3f(dx, dy, dz);
  let magnitude = length(gradient);
  let normal = gradient / max(magnitude, 0.0001);

  textureStore(
    gradient_texture,
    coordinate,
    vec4f(normal * 0.5 + 0.5, min(magnitude / 128.0, 1.0)),
  );
}

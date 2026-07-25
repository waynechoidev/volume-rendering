fn sample_density(texture_position: vec3f) -> f32 {
  return textureSampleLevel(
    volume_texture,
    volume_sampler,
    texture_position,
    0.0,
  ).r * params.density_scale;
}

fn density_normal(
  texture_position: vec3f,
  center_density: f32,
) -> vec4f {
  // Forward differences approximate the local density gradient with three
  // additional samples. Density increases inward, so -∇ρ points outward.
  let offset = params.gradient_step;
  let gradient = vec3f(
    sample_density(texture_position + vec3f(offset, 0.0, 0.0)) -
      center_density,
    sample_density(texture_position + vec3f(0.0, offset, 0.0)) -
      center_density,
    sample_density(texture_position + vec3f(0.0, 0.0, offset)) -
      center_density,
  );
  let magnitude = length(gradient);
  return vec4f(-gradient / max(magnitude, 0.0001), magnitude);
}

fn light_transmittance(
  texture_position: vec3f,
  light_direction: vec3f,
) -> f32 {
  // A short secondary march estimates how much cloud lies between the sample
  // and the sun. This produces soft volumetric self-shadowing without treating
  // the density field like a solid surface.
  var optical_depth = 0.0;
  for (var index = 1u; index <= 6u; index += 1u) {
    let light_sample =
      texture_position + light_direction * (f32(index) * 0.045);
    optical_depth += sample_density(light_sample) * 0.045;
  }
  return exp(-optical_depth * params.absorption * 0.85);
}


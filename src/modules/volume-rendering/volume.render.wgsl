@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
  let ndc = input.uv * vec2f(2.0, -2.0) + vec2f(-1.0, 1.0);
  let far_clip = vec4f(ndc, 1.0, 1.0);
  let far_world_homogeneous = camera.inverse_view_projection * far_clip;
  let far_world =
    far_world_homogeneous.xyz / far_world_homogeneous.w;
  let ray_origin = camera.position.xyz;
  let ray_direction = normalize(far_world - ray_origin);

  let interval =
    intersect_box(ray_origin, ray_direction, params.volume_half_extent);
  let entry = max(interval.near, 0.0);
  let background =
    mix(vec3f(0.10, 0.26, 0.50), vec3f(0.42, 0.66, 0.86), input.uv.y);

  if (interval.far <= entry) {
    return vec4f(background, 1.0);
  }

  let step_count = max(params.step_count, 1u);
  let step_length = (interval.far - entry) / f32(step_count);
  let light_direction = normalize(vec3f(0.6, 0.8, 0.35));
  var radiance = vec3f(0.0);
  var transmittance = 1.0;

  // Front-to-back volume integration. MAX_STEPS keeps the loop statically
  // bounded while step_count remains an interactive runtime parameter.
  const MAX_STEPS = 256u;
  for (var index = 0u; index < MAX_STEPS; index += 1u) {
    if (index >= step_count || transmittance < 0.01) {
      break;
    }

    let distance = entry + (f32(index) + 0.5) * step_length;
    let world_position = ray_origin + ray_direction * distance;
    let texture_position =
      world_to_texture(world_position, params.volume_half_extent);
    let density = sample_density(texture_position);

    if (density > 0.002) {
      let normal_and_strength =
        density_normal(texture_position, density);
      let curvature_light =
        0.25 +
        0.75 *
          max(dot(normal_and_strength.xyz, light_direction), 0.0);
      let curvature_weight =
        smoothstep(0.008, 0.08, normal_and_strength.w);
      let sunlight =
        light_transmittance(texture_position, light_direction);
      let powder = 1.0 - exp(-density * step_length * 3.0);
      let view_light_alignment =
        pow(max(dot(ray_direction, light_direction), 0.0), 6.0);
      let shadow_color = vec3f(0.72, 0.75, 0.80);
      let sun_color = vec3f(1.06, 1.04, 1.0);
      let sample_color =
        mix(shadow_color, sun_color, 0.58 + sunlight * 0.42) *
        mix(0.82, 0.52 + curvature_light * 0.58, curvature_weight) *
        (0.90 + powder * 0.10) +
        vec3f(view_light_alignment * sunlight * 0.08);

      // Beer–Lambert: T(Δs) = exp(-σ ρ Δs).
      // The absorbed fraction α = 1 - T is composited front-to-back.
      let alpha =
        1.0 - exp(-params.absorption * density * step_length);
      radiance += transmittance * alpha * sample_color;
      transmittance *= 1.0 - alpha;
    }
  }

  return vec4f(radiance + transmittance * background, 1.0);
}


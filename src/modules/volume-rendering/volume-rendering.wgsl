struct CameraUniforms {
  view_projection: mat4x4f,
  inverse_view_projection: mat4x4f,
  position: vec4f,
};

struct VolumeParameters {
  step_count: u32,
  density_scale: f32,
  absorption: f32,
  gradient_step: f32,
  volume_half_extent: f32,
  _padding_0: f32,
  _padding_1: vec2f,
};

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

struct RayInterval {
  near: f32,
  far: f32,
};

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var volume_texture: texture_3d<f32>;
@group(0) @binding(2) var volume_sampler: sampler;
@group(0) @binding(3) var<uniform> params: VolumeParameters;

@vertex
fn vertex_main(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
  // A single oversized triangle covers the viewport without a vertex buffer.
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

fn intersect_box(
  ray_origin: vec3f,
  ray_direction: vec3f,
  half_extent: f32,
) -> RayInterval {
  // Slab intersection: solve the entry/exit t values for all three pairs of
  // parallel box planes, then intersect the resulting intervals.
  let inverse_direction = 1.0 / ray_direction;
  let t0 = (-vec3f(half_extent) - ray_origin) * inverse_direction;
  let t1 = (vec3f(half_extent) - ray_origin) * inverse_direction;
  let smaller = min(t0, t1);
  let larger = max(t0, t1);
  return RayInterval(
    max(max(smaller.x, smaller.y), smaller.z),
    min(min(larger.x, larger.y), larger.z),
  );
}

fn world_to_texture(position: vec3f, half_extent: f32) -> vec3f {
  return position / (2.0 * half_extent) + 0.5;
}

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

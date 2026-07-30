struct CameraUniforms {
  view_projection: mat4x4f,
  inverse_view_projection: mat4x4f,
  position: vec4f,
};

struct TransferParameters {
  step_count: u32,
  opacity_scale: f32,
  intensity_maximum: f32,
  _padding_0: f32,
  volume_half_extent: vec3f,
  _padding_1: f32,
  vessel_minimum: f32,
  vessel_maximum: f32,
  vessel_opacity: f32,
  _padding_2: f32,
  core_minimum: f32,
  core_maximum: f32,
  core_opacity: f32,
  _padding_3: f32,
};

struct RayInterval {
  near: f32,
  far: f32,
};

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var intensity_texture: texture_3d<f32>;
@group(0) @binding(2) var volume_sampler: sampler;
@group(0) @binding(3) var<uniform> params: TransferParameters;

fn intersect_box(origin: vec3f, direction: vec3f) -> RayInterval {
  let inverse_direction = 1.0 / direction;
  let t0 = (-params.volume_half_extent - origin) * inverse_direction;
  let t1 = (params.volume_half_extent - origin) * inverse_direction;
  let axis_near = min(t0, t1);
  let axis_far = max(t0, t1);
  return RayInterval(
    max(max(axis_near.x, axis_near.y), axis_near.z),
    min(min(axis_far.x, axis_far.y), axis_far.z),
  );
}

fn range_weight(value: f32, minimum: f32, maximum: f32) -> f32 {
  let feather = max((maximum - minimum) * 0.12, 1.0);
  let lower = smoothstep(minimum, minimum + feather, value);
  var upper = 1.0;
  if (maximum < params.intensity_maximum) {
    upper = 1.0 - smoothstep(maximum - feather, maximum, value);
  }
  return lower * upper;
}

fn transfer(intensity: f32) -> vec4f {
  let vessel_weight =
    range_weight(intensity, params.vessel_minimum, params.vessel_maximum);
  let core_weight =
    range_weight(intensity, params.core_minimum, params.core_maximum);
  let total_weight = vessel_weight + core_weight;
  let color = (
    vessel_weight * vec3f(0.94, 0.12, 0.17) +
    core_weight * vec3f(1.0, 0.86, 0.67)
  ) / max(total_weight, 0.0001);
  let extinction = params.opacity_scale * (
    vessel_weight * params.vessel_opacity +
    core_weight * params.core_opacity
  );
  return vec4f(color, extinction);
}

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let ndc = uv * vec2f(2.0, -2.0) + vec2f(-1.0, 1.0);
  let far_world_h =
    camera.inverse_view_projection * vec4f(ndc, 1.0, 1.0);
  let far_world = far_world_h.xyz / far_world_h.w;
  let origin = camera.position.xyz;
  let direction = normalize(far_world - origin);
  let interval = intersect_box(origin, direction);
  let entry = max(interval.near, 0.0);
  let background =
    mix(vec3f(0.018, 0.022, 0.032), vec3f(0.06, 0.07, 0.09), uv.y);

  if (interval.far <= entry) {
    return vec4f(background, 1.0);
  }

  let step_count = max(params.step_count, 1u);
  let step_length = (interval.far - entry) / f32(step_count);
  let voxels_per_world_unit =
    f32(textureDimensions(intensity_texture).x) /
    (2.0 * params.volume_half_extent.x);
  let voxel_step_length = step_length * voxels_per_world_unit;
  var radiance = vec3f(0.0);
  var transmittance = 1.0;

  const MAX_STEPS = 512u;
  for (var index = 0u; index < MAX_STEPS; index += 1u) {
    if (index >= step_count || transmittance < 0.01) {
      break;
    }
    let distance = entry + (f32(index) + 0.5) * step_length;
    let position = origin + direction * distance;
    let texture_position =
      position / (2.0 * params.volume_half_extent) + 0.5;
    let intensity = textureSampleLevel(
      intensity_texture,
      volume_sampler,
      texture_position,
      0.0,
    ).r * params.intensity_maximum;
    let material = transfer(intensity);

    if (material.a > 0.0001) {
      let alpha = 1.0 - exp(-material.a * voxel_step_length);
      radiance += transmittance * alpha * material.rgb;
      transmittance *= 1.0 - alpha;
    }
  }

  return vec4f(radiance + transmittance * background, 1.0);
}

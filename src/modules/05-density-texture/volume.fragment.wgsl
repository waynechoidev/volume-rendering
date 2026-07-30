struct CameraUniforms {
  view_projection: mat4x4f,
  inverse_view_projection: mat4x4f,
  position: vec4f,
};

struct VolumeParameters {
  step_count: u32,
  density_scale: f32,
  absorption: f32,
  half_extent: f32,
};

struct RayInterval {
  near: f32,
  far: f32,
};

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var density_texture: texture_3d<f32>;
@group(0) @binding(2) var density_sampler: sampler;
@group(0) @binding(3) var<uniform> params: VolumeParameters;

fn intersect_box(origin: vec3f, direction: vec3f) -> RayInterval {
  let half_extent = params.half_extent;
  let box_min = vec3f(-half_extent);
  let box_max = vec3f(half_extent);
  let inverse_direction = 1.0 / direction;
  let t0 = (box_min - origin) * inverse_direction;
  let t1 = (box_max - origin) * inverse_direction;
  let axis_near = min(t0, t1);
  let axis_far = max(t0, t1);
  return RayInterval(
    max(max(axis_near.x, axis_near.y), axis_near.z),
    min(min(axis_far.x, axis_far.y), axis_far.z),
  );
}

fn world_to_texture(position: vec3f) -> vec3f {
  return position / (2.0 * params.half_extent) + 0.5;
}

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let ndc = uv * vec2f(2.0, -2.0) + vec2f(-1.0, 1.0);
  let far_clip = vec4f(ndc, 1.0, 1.0);
  let far_world_h = camera.inverse_view_projection * far_clip;
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
  var radiance = vec3f(0.0);
  var transmittance = 1.0;

  const MAX_STEPS = 256u;
  for (var index = 0u; index < MAX_STEPS; index += 1u) {
    if (index >= step_count || transmittance < 0.01) {
      break;
    }
    let distance = entry + (f32(index) + 0.5) * step_length;
    let position = origin + direction * distance;
    let texture_position = world_to_texture(position);
    let density = textureSampleLevel(
      density_texture,
      density_sampler,
      texture_position,
      0.0,
    ).r * params.density_scale;
    let alpha =
      1.0 - exp(-params.absorption * density * step_length);
    let sample_color = vec3f(0.86, 0.92, 1.0);
    radiance += transmittance * alpha * sample_color;
    transmittance *= 1.0 - alpha;
  }

  return vec4f(radiance + transmittance * background, 1.0);
}

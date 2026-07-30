struct CameraUniforms {
  view_projection: mat4x4f,
  inverse_view_projection: mat4x4f,
  position: vec4f,
};

struct MediumParameters {
  density: f32,
  absorption: f32,
  half_extent: f32,
  _padding: f32,
};

struct RayInterval {
  near: f32,
  far: f32,
};

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> params: MediumParameters;

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

  let distance_inside = interval.far - entry;
  let optical_depth =
    params.absorption * params.density * distance_inside;
  let transmittance = exp(-optical_depth);
  let medium_color = vec3f(0.92, 0.95, 1.0);
  let color =
    (1.0 - transmittance) * medium_color +
    transmittance * background;
  return vec4f(color, 1.0);
}

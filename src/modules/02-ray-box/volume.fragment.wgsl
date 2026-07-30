struct CameraUniforms {
  view_projection: mat4x4f,
  inverse_view_projection: mat4x4f,
  position: vec4f,
};

struct RayInterval {
  near: f32,
  far: f32,
};

@group(0) @binding(0) var<uniform> camera: CameraUniforms;

fn intersect_box(origin: vec3f, direction: vec3f) -> RayInterval {
  let inverse_direction = 1.0 / direction;
  let t0 = (-vec3f(3.2) - origin) * inverse_direction;
  let t1 = (vec3f(3.2) - origin) * inverse_direction;
  let smaller = min(t0, t1);
  let larger = max(t0, t1);
  return RayInterval(
    max(max(smaller.x, smaller.y), smaller.z),
    min(min(larger.x, larger.y), larger.z),
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

  if (interval.far <= entry) {
    return vec4f(0.01, 0.02, 0.04, 1.0);
  }

  let distance_inside = interval.far - entry;
  let normalized_distance = 1.0 - exp(-distance_inside * 0.28);
  let near_color = vec3f(0.12, 0.45, 0.95);
  let far_color = vec3f(1.0, 0.45, 0.12);
  return vec4f(mix(near_color, far_color, normalized_distance), 1.0);
}

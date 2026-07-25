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


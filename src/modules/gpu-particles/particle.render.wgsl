struct Particle {
  position: vec4f,
  velocity: vec4f,
};

struct CameraUniforms {
  view_projection: mat4x4f,
  inverse_view_projection: mat4x4f,
  position: vec4f,
};

struct SimulationParameters {
  delta_time: f32,
  gravity: f32,
  speed: f32,
  time: f32,
  particle_count: u32,
  bounds: f32,
  point_size: f32,
  aspect_scale: f32,
};

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f,
  @location(1) radial: vec2f,
};

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;
@group(0) @binding(2) var<uniform> params: SimulationParameters;

@vertex
fn vertex_main(
  @builtin(vertex_index) vertex_index: u32,
  @builtin(instance_index) instance_index: u32,
) -> VertexOutput {
  let corners = array(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(1.0, 1.0),
    vec2f(-1.0, -1.0),
    vec2f(1.0, 1.0),
    vec2f(-1.0, 1.0),
  );
  let particle = particles[instance_index];
  let corner = corners[vertex_index];
  var clip_position =
    camera.view_projection * vec4f(particle.position.xyz, 1.0);
  let screen_offset = corner * vec2f(params.aspect_scale, 1.0);
  clip_position = vec4f(
    clip_position.xy + screen_offset * params.point_size * clip_position.w,
    clip_position.zw,
  );

  let speed = length(particle.velocity.xyz);
  let low_color = vec3f(0.20, 0.55, 1.0);
  let high_color = vec3f(1.0, 0.28, 0.58);

  var output: VertexOutput;
  output.position = clip_position;
  output.color = mix(low_color, high_color, clamp(speed * 0.8, 0.0, 1.0));
  output.radial = corner;
  return output;
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
  let radius_squared = dot(input.radial, input.radial);
  if (radius_squared > 1.0) {
    discard;
  }

  let alpha = smoothstep(1.0, 0.15, radius_squared);
  return vec4f(input.color * (0.65 + alpha * 0.55), alpha);
}

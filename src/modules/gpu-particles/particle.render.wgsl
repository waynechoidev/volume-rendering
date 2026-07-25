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
  let radius = length(particle.position.xz);
  let heat = 1.0 - smoothstep(0.9, params.bounds, radius);
  let palette_phase =
    particle.velocity.w * 6.28318 + radius * 0.31;
  let spectral_color =
    vec3f(0.55) +
    vec3f(0.45) *
      cos(palette_phase + vec3f(0.0, 2.1, 4.2));
  let outer_color =
    mix(vec3f(0.12, 0.18, 0.75), spectral_color, 0.72);
  let middle_color = vec3f(1.0, 0.20, 0.055);
  let inner_color = vec3f(1.0, 0.92, 0.62);
  let disk_color = mix(outer_color, middle_color, smoothstep(0.0, 0.72, heat));
  let thermal_color =
    mix(disk_color, inner_color, smoothstep(0.68, 1.0, heat));
  let color =
    mix(thermal_color, spectral_color, (1.0 - heat) * 0.38);

  var output: VertexOutput;
  output.position = clip_position;
  output.color = color * (0.82 + clamp(speed * 0.12, 0.0, 0.35));
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

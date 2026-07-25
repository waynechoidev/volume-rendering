struct Particle {
  position: vec4f,
  velocity: vec4f,
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

@group(0) @binding(0) var<storage, read> particles_in: array<Particle>;
@group(0) @binding(1) var<storage, read_write> particles_out: array<Particle>;
@group(0) @binding(2) var<uniform> params: SimulationParameters;

@compute @workgroup_size(256)
fn compute_main(@builtin(global_invocation_id) id: vec3u) {
  let index = id.x;
  if (index >= params.particle_count) {
    return;
  }

  var particle = particles_in[index];
  let dt = min(params.delta_time, 0.05) * params.speed;
  let position = particle.position.xyz;
  let radius_xz = max(length(position.xz), 0.001);
  let radial_xz = vec3f(position.x / radius_xz, 0.0, position.z / radius_xz);
  let tangent = vec3f(-radial_xz.z, 0.0, radial_xz.x);
  let black_hole_mass = max(params.gravity, 0.1);
  let gravity_force =
    -radial_xz * (black_hole_mass / (radius_xz * radius_xz + 0.18));
  let vertical_force =
    vec3f(
      0.0,
      -position.y * black_hole_mass /
        (radius_xz * radius_xz * radius_xz + 0.7),
      0.0,
    );
  let phase = particle.velocity.w * 6.28318 + params.time * 0.18;
  let disk_turbulence =
    tangent * sin(phase + radius_xz * 2.7) * 0.018 +
    vec3f(0.0, sin(phase * 1.7 + radius_xz) * 0.012, 0.0);
  let inward_drift = -radial_xz * (0.004 + 0.018 / (radius_xz + 0.4));
  let acceleration =
    gravity_force + vertical_force + disk_turbulence + inward_drift;

  let damping = exp(-0.008 * dt);
  particle.velocity = vec4f(
    particle.velocity.xyz * damping + acceleration * dt,
    particle.velocity.w,
  );
  particle.position = vec4f(
    particle.position.xyz + particle.velocity.xyz * dt,
    particle.position.w,
  );

  let limit = params.bounds;
  let next_radius = length(particle.position.xz);
  let exclusion_radius = 0.58;
  if (next_radius < exclusion_radius || next_radius > limit * 1.12) {
    let reset_angle =
      particle.velocity.w * 31.4159 + params.time * 0.035;
    let reset_radius =
      limit * (0.76 + 0.19 * fract(particle.velocity.w * 17.371));
    let reset_speed =
      sqrt(
        black_hole_mass * reset_radius /
          (reset_radius * reset_radius + 0.18),
      );
    particle.position = vec4f(
      cos(reset_angle) * reset_radius,
      sin(phase) * reset_radius * 0.035,
      sin(reset_angle) * reset_radius,
      1.0,
    );
    particle.velocity = vec4f(
      -sin(reset_angle) * reset_speed - cos(reset_angle) * 0.02,
      sin(phase * 1.3) * 0.025,
      cos(reset_angle) * reset_speed - sin(reset_angle) * 0.02,
      particle.velocity.w,
    );
  }

  particles_out[index] = particle;
}

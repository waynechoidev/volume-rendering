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
  let swirl = vec3f(
    -particle.position.z,
    sin(params.time * 0.7 + particle.velocity.w * 6.28318) * 0.25,
    particle.position.x,
  ) * 0.08;

  particle.velocity = vec4f(
    particle.velocity.xyz +
      (swirl + vec3f(0.0, params.gravity, 0.0)) * dt,
    particle.velocity.w,
  );
  particle.position = vec4f(
    particle.position.xyz + particle.velocity.xyz * dt,
    particle.position.w,
  );

  let limit = params.bounds;
  if (particle.position.x > limit) {
    particle.position.x = limit;
    particle.velocity.x = -abs(particle.velocity.x) * 0.82;
  } else if (particle.position.x < -limit) {
    particle.position.x = -limit;
    particle.velocity.x = abs(particle.velocity.x) * 0.82;
  }
  if (particle.position.y > limit) {
    particle.position.y = limit;
    particle.velocity.y = -abs(particle.velocity.y) * 0.82;
  } else if (particle.position.y < -limit) {
    particle.position.y = -limit;
    particle.velocity.y = abs(particle.velocity.y) * 0.82;
  }
  if (particle.position.z > limit) {
    particle.position.z = limit;
    particle.velocity.z = -abs(particle.velocity.z) * 0.82;
  } else if (particle.position.z < -limit) {
    particle.position.z = -limit;
    particle.velocity.z = abs(particle.velocity.z) * 0.82;
  }

  particles_out[index] = particle;
}

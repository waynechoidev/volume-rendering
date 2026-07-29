@fragment
fn main(
  @location(0) color: vec3f,
  @location(1) radial: vec2f,
) -> @location(0) vec4f {
  let radius_squared = dot(radial, radial);
  if (radius_squared > 1.0) {
    discard;
  }

  let alpha = smoothstep(1.0, 0.15, radius_squared);
  return vec4f(color * (0.65 + alpha * 0.55), alpha);
}

struct Parameters {
  resolution: vec2u,
  time: f32,
  scale: f32,
  speed: f32,
  contrast: f32,
  _padding: vec2f,
};

@group(0) @binding(0)
var output_texture: texture_storage_2d<rgba8unorm, write>;

@group(0) @binding(1)
var<uniform> params: Parameters;

fn palette(value: f32) -> vec3f {
  return 0.5 + 0.5 * cos(
    6.28318 * (value + vec3f(0.0, 0.18, 0.36)),
  );
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (any(id.xy >= params.resolution)) {
    return;
  }

  let resolution = vec2f(params.resolution);
  var point = (vec2f(id.xy) + 0.5) / resolution;
  point = (point * 2.0 - 1.0) *
    vec2f(resolution.x / resolution.y, 1.0);

  let time = params.time * params.speed;
  var field = 0.0;
  var amplitude = 0.55;
  var sample_point = point * params.scale;

  for (var octave = 0; octave < 5; octave += 1) {
    let wave =
      sin(sample_point.x * 2.1 + time + field) *
      cos(sample_point.y * 2.4 - time * 0.73);
    field += wave * amplitude;
    sample_point =
      mat2x2f(0.80, -0.60, 0.60, 0.80) * sample_point * 1.72 + 0.17;
    amplitude *= 0.52;
  }

  let rings = sin(length(point) * 9.0 - time * 1.4 + field * 2.5);
  let value = clamp(0.5 + (field + rings * 0.18) * params.contrast, 0.0, 1.0);
  let vignette = 1.0 - smoothstep(0.65, 1.65, length(point));
  let color = palette(value + time * 0.025) * (0.25 + value * 1.15) * vignette;

  textureStore(output_texture, vec2i(id.xy), vec4f(color, 1.0));
}

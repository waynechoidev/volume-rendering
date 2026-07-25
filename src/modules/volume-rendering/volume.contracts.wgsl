struct CameraUniforms {
  view_projection: mat4x4f,
  inverse_view_projection: mat4x4f,
  position: vec4f,
};

struct VolumeParameters {
  step_count: u32,
  density_scale: f32,
  absorption: f32,
  gradient_step: f32,
  volume_half_extent: f32,
  _padding_0: f32,
  _padding_1: vec2f,
};

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

struct RayInterval {
  near: f32,
  far: f32,
};

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var volume_texture: texture_3d<f32>;
@group(0) @binding(2) var volume_sampler: sampler;
@group(0) @binding(3) var<uniform> params: VolumeParameters;


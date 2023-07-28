struct VertexOut {
	@builtin(position) position : vec4f,
	@location(0) uv : vec2f,
}

@group(0) @binding(0) var<uniform> worldToCamMat: mat4x4f;
@group(0) @binding(1) var<uniform> tick: u32;
@group(0) @binding(2) var gradientTexture: texture_2d<f32>;

@vertex
fn vertex_main(@location(0) position: vec4f, @location(1) uv: vec2f) -> VertexOut {
	var output : VertexOut;
	var a : u32 = tick;

	output.position = worldToCamMat * position;

	output.uv = uv;

	return output;
}

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4f {
	return textureLoad(gradientTexture, vec2i(fragData.uv), 0);
}
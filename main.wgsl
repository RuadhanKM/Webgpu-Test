struct VertexOut {
	@builtin(position) position : vec4f,
	@location(0) uv : vec2f,
	@location(1) normal : vec3f,
	@location(2) overlayColor : vec3f,
	@location(3) blockLocation : vec3f
}

@group(0) @binding(0) var<uniform> worldToCamMat: mat4x4f;
@group(0) @binding(1) var<uniform> tick: u32;
@group(0) @binding(2) var diffuseTexture: texture_2d<f32>;
@group(0) @binding(3) var<uniform> highlighted: vec3i;

const lightDir: vec3f = vec3f(100, 200, 150);

@vertex
fn vertex_main(@location(0) position: vec4f, @location(1) uv: vec2f, @location(2) normal: vec3f, @location(3) blockLocation: vec3f) -> VertexOut {
	var output : VertexOut;
	var a : u32 = tick;

	if length(blockLocation - vec3f(highlighted)) <= 0.1 {
		output.overlayColor = vec3f(0.3);
	}

	output.uv = uv;
	output.normal = normal;

	output.position = worldToCamMat * position;
	
	return output;
}

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4f {
	var color: vec3f = mix((textureLoad(diffuseTexture, vec2i(fragData.uv), 0).xyz + fragData.overlayColor) * max(dot(fragData.normal, normalize(lightDir)), 0.3), vec3f(0.53,0.81,0.92), clamp(fragData.position.w/80, 0, 1));
	return vec4f(color, 1);
}
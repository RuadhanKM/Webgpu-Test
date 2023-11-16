struct VertexOut {
	@builtin(position) position : vec4f,
	@location(0) uv : vec2f,
	@location(1) overlayColor : vec3f,
	@location(2) blockLocation : vec3f,
	@location(3) vertWorldPos : vec4f,
	@location(4) blockId : f32
}

@group(0) @binding(0) var<uniform> worldToCamMat: mat4x4f;
@group(0) @binding(1) var<uniform> tick: u32;
@group(0) @binding(2) var diffuseTexture: texture_2d<f32>;
@group(0) @binding(3) var<uniform> highlighted: vec3i;
@group(0) @binding(4) var<uniform> camPos: vec3f;
@group(0) @binding(5) var specularTexture: texture_2d<f32>;
@group(0) @binding(6) var normalTexture: texture_2d<f32>;
@group(0) @binding(7) var<uniform> underwater: u32;
@group(0) @binding(8) var<uniform> worldToCamNoRotMat: mat4x4f;

const lightDir : vec3f = normalize(vec3f(90, 180, 100));
const lightColor : vec3f = vec3f(0.75, 0.75, 0.75);
const ambient : vec3f = lightColor * 0.4;

const fogColor : vec3f = vec3f(0.53,0.81,0.92);
const waterColor : vec3f = vec3f(0.23,0.31,0.82);

@vertex
fn vertex_main(@location(0) position: vec4f, @location(1) uv: vec2f, @location(2) blockLocation: vec3f, @location(3) blockId: f32) -> VertexOut {
	var output : VertexOut;
	output.blockId = blockId;
	if abs(blockId+1) <= 0.5 {return output;}
	if (false) { var a : u32 = tick; var b = worldToCamMat;}

	if length(blockLocation - vec3f(highlighted)) <= 0.1 {
		output.overlayColor = vec3f(0.3);
	}

	output.uv = uv;
	output.vertWorldPos = position;
	output.blockLocation = blockLocation;
	
	if abs(blockId - 9) <= 1 && blockLocation.y < output.vertWorldPos.y {
		output.vertWorldPos.y -= 0.1;
	}

	if blockId+1 <= 0 	{output.position = worldToCamNoRotMat * output.vertWorldPos;} else 
						{output.position = worldToCamMat * output.vertWorldPos;}
	
	return output;
}

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4f {
	if abs(fragData.blockId+1) <= 0.5 {discard;}

	var diffuseTex = textureLoad(diffuseTexture, vec2i(fragData.uv), 0);
	var normalTex = textureLoad(normalTexture, vec2i(fragData.uv), 0);
	var specularTex = textureLoad(specularTexture, vec2i(fragData.uv), 0);

	var normal : vec3f;
	
	if fragData.blockId+1 <= 0	{normal = normalize((transpose(worldToCamNoRotMat) * vec4f(fragData.blockLocation, 1)).xyz);} else
								{normal = normalize(normalTex.xyz-vec3f(0.5));}

	var diffuseFactor : f32 = max(dot(normal, lightDir), 0);
	var diffuse : vec3f = diffuseFactor * lightColor;
	
	var fogFactor : f32 = clamp((fragData.position.z*fragData.position.w)/select(80.0, 10.0, underwater == 1), 0, 1);
	
	var specularFactor : f32 = max(pow(dot(normalize(camPos - fragData.vertWorldPos.xyz), normalize(reflect(-lightDir, normal))), 80), 0);
	var specular : vec3f = lightColor * specularFactor * length(specularTex.xyz);
	
	var color: vec3f = (select(ambient, ambient*2, fragData.blockId+1 <= 0) + diffuse + specular) * diffuseTex.xyz;

	color = mix(color, select(fogColor, waterColor, underwater == 1), fogFactor);
	color += fragData.overlayColor;

	return vec4f(color, 1);
}
const canvas = document.getElementById("c")
const ctx = canvas.getContext("webgpu")

// Resolve a bunch of promises
function fetchUtils() {
    return new Promise((resolve, reject) => fetch("main.wgsl").then(shaderSourceFile => {
        if (!shaderSourceFile.ok) {reject(Error("Failed to fetch shader, or shader was not found!"))}
        
        let a = new Image()
        a.src = "diffuse.png"

        Promise.all([shaderSourceFile.text(), navigator.gpu.requestAdapter(), a.decode().then(() => createImageBitmap(a))]).then(([shaderSource, adapter, img]) => {
            adapter.requestDevice().then(device => resolve([adapter, device, shaderSource, img])).catch(reject)
        }).catch(reject)
    }).catch(reject))
}

let camPos = [3, 2, 5]
let camRot = [-0.3, 0.5, 0]
let keys = {}
document.addEventListener("mousemove", e => {
    camRot[1] -= e.movementX/500
    camRot[0] -= e.movementY/500
})
document.addEventListener("keydown", e => keys[e.key] = true)
document.addEventListener("keyup", e => keys[e.key] = false)
canvas.addEventListener("click", async () => {
    canvas.requestPointerLock();
});

const blockSize = 1

function createBlockVertices([x, y, z], id, textureSize) {
    let texYP = id*textureSize+textureSize
    let texYN = id*textureSize

    return [
        // Top
        x+blockSize/2,y+blockSize/2,z-blockSize/2,1,
        textureSize,texYN,

        x-blockSize/2,y+blockSize/2,z+blockSize/2,1,
        0,texYP,
        
        x+blockSize/2,y+blockSize/2,z+blockSize/2,1,
        textureSize,texYP,

        x-blockSize/2,y+blockSize/2,z-blockSize/2,1,
        0,texYN,

        x-blockSize/2,y+blockSize/2,z+blockSize/2,1,
        0,texYP,
        
        x+blockSize/2,y+blockSize/2,z-blockSize/2,1,
        textureSize,texYN,

        // Bottom
        x+blockSize/2,y-blockSize/2,z+blockSize/2,1,
        textureSize*2,texYN,

        x-blockSize/2,y-blockSize/2,z+blockSize/2,1,
        textureSize,texYN,
        
        x+blockSize/2,y-blockSize/2,z-blockSize/2,1,
        textureSize*2,texYP,

        x-blockSize/2,y-blockSize/2,z-blockSize/2,1,
        textureSize,texYP,

        x+blockSize/2,y-blockSize/2,z-blockSize/2,1,
        textureSize*2,texYP,
        
        x-blockSize/2,y-blockSize/2,z+blockSize/2,1,
        textureSize,texYN,

        // Front
        x-blockSize/2,y+blockSize/2,z+blockSize/2,1,
        textureSize*2,texYN,

        x+blockSize/2,y-blockSize/2,z+blockSize/2,1,
        textureSize*3,texYP,
        
        x+blockSize/2,y+blockSize/2,z+blockSize/2,1,
        textureSize*3,texYN,

        x-blockSize/2,y-blockSize/2,z+blockSize/2,1,
        textureSize*2,texYP,

        x+blockSize/2,y-blockSize/2,z+blockSize/2,1,
        textureSize*3,texYP,
        
        x-blockSize/2,y+blockSize/2,z+blockSize/2,1,
        textureSize*2,texYN,

        // Right
        x+blockSize/2,y-blockSize/2,z+blockSize/2,1,
        textureSize*3,texYP,

        x+blockSize/2,y+blockSize/2,z-blockSize/2,1,
        textureSize*4,texYN,
        
        x+blockSize/2,y+blockSize/2,z+blockSize/2,1,
        textureSize*3,texYN,

        x+blockSize/2,y-blockSize/2,z-blockSize/2,1,
        textureSize*4,texYP,

        x+blockSize/2,y+blockSize/2,z-blockSize/2,1,
        textureSize*4,texYN,
        
        x+blockSize/2,y-blockSize/2,z+blockSize/2,1,
        textureSize*3,texYP,

        // Back
        x+blockSize/2,y-blockSize/2,z-blockSize/2,1,
        textureSize*4,texYP,

        x-blockSize/2,y+blockSize/2,z-blockSize/2,1,
        textureSize*5,texYN,
        
        x+blockSize/2,y+blockSize/2,z-blockSize/2,1,
        textureSize*4,texYN,

        x-blockSize/2,y-blockSize/2,z-blockSize/2,1,
        textureSize*5,texYP,

        x-blockSize/2,y+blockSize/2,z-blockSize/2,1,
        textureSize*5,texYN,
        
        x+blockSize/2,y-blockSize/2,z-blockSize/2,1,
        textureSize*4,texYP,

        // Left
        x-blockSize/2,y+blockSize/2,z-blockSize/2,1,
        textureSize*5,texYN,

        x-blockSize/2,y-blockSize/2,z+blockSize/2,1,
        textureSize*6,texYP,
        
        x-blockSize/2,y+blockSize/2,z+blockSize/2,1,
        textureSize*6,texYN,

        x-blockSize/2,y-blockSize/2,z-blockSize/2,1,
        textureSize*5,texYP,

        x-blockSize/2,y-blockSize/2,z+blockSize/2,1,
        textureSize*6,texYP,
        
        x-blockSize/2,y+blockSize/2,z-blockSize/2,1,
        textureSize*5,texYN,
    ]
}

fetchUtils().then(([adapter, device, shaderSource, diffuseImage]) => {
    // Create shader module
    const shaderModule = device.createShaderModule({
        code: shaderSource,
    });

    // Setup canvas
    ctx.configure({
        device: device,
        format: navigator.gpu.getPreferredCanvasFormat(),
        alphaMode: "premultiplied",
    });

    // Create test vertices in buffer
    const vertices = new Float32Array([...createBlockVertices([0,0,0], 1, 16), ...createBlockVertices([-2, 0, 0], 0, 16), ...createBlockVertices([2, 0, 0], 2, 16)])

    // Create vertex buffer
    const vertexBuffer = device.createBuffer({
        size: vertices.byteLength, // make it big enough to store test vertices in
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    const worldToCamMatBuffer = device.createBuffer({
        size: 64,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    })

    const tickBuffer = device.createBuffer({
        size: 8,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    })

    const diffuseTexture = device.createTexture({
        size: [diffuseImage.width, diffuseImage.height, 1],
        format: "rgba8unorm",
        usage:  GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT,
    })

    device.queue.copyExternalImageToTexture(
        { source: diffuseImage },
        { texture: diffuseTexture },
        [diffuseImage.width, diffuseImage.height]
    );

    // Write test vertices to gpu
    device.queue.writeBuffer(vertexBuffer, 0, vertices, 0, vertices.length);

    // Specify format of test vertices buffer
    const vertexBuffers = [
        {
            attributes: [
                {
                    shaderLocation: 0, // position
                    offset: 0,
                    format: "float32x4",
                },
                {
                    shaderLocation: 1, // uv
                    offset: 16,
                    format: "float32x2",
                },
            ],
            arrayStride: 24,
            stepMode: "vertex",
        }
    ];
    
    // Specify format of pipeline
    const pipelineDescriptor = {
        vertex: {
            module: shaderModule,
            entryPoint: "vertex_main",
            buffers: vertexBuffers,
        },
        fragment: {
            module: shaderModule,
            entryPoint: "fragment_main",
            targets: [
                {
                    format: navigator.gpu.getPreferredCanvasFormat(),
                },
            ],
        },
        primitive: {
            topology: "triangle-list",
            cullMode: 'back'
        },
        layout: "auto",
    };

    // Create the pipeline
    const renderPipeline = device.createRenderPipeline(pipelineDescriptor);

    const bindGroup = device.createBindGroup({
        layout: renderPipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: { buffer: worldToCamMatBuffer }
            },
            {
                binding: 1,
                resource: { buffer: tickBuffer }
            },
            {
                binding: 2,
                resource: diffuseTexture.createView()
            }
        ],
    });
    
    const renderPassDescriptor = {
        colorAttachments: [
            {
                clearValue: { r: 0.4, g: 0.3, b: 0.2, a: 1.0 },
                loadOp: "clear",
                storeOp: "store",
                view: ctx.getCurrentTexture().createView(),
            },
        ],
    };
    
    const projectionMat = mat4.perspective(Math.PI/2, canvas.clientWidth / canvas.clientHeight, 0.1, 2000)

    let tick = 0
    setInterval(() => {
        let camToWorldMat = mat4.rotateZYX(mat4.translation(camPos), camRot)
        
        if (keys.w) {
            let lookVector = mat4.lookVector(camToWorldMat)
            camPos[0] -= lookVector[0]/50
            camPos[1] -= lookVector[1]/50
            camPos[2] -= lookVector[2]/50
        }
        if (keys.a) {
            let rightVector = mat4.rightVector(camToWorldMat)
            camPos[0] -= rightVector[0]/50
            camPos[1] -= rightVector[1]/50
            camPos[2] -= rightVector[2]/50
        }
        if (keys.s) {
            let lookVector = mat4.lookVector(camToWorldMat)
            camPos[0] += lookVector[0]/50
            camPos[1] += lookVector[1]/50
            camPos[2] += lookVector[2]/50
        }
        if (keys.d) {
            let rightVector = mat4.rightVector(camToWorldMat)
            camPos[0] += rightVector[0]/50
            camPos[1] += rightVector[1]/50
            camPos[2] += rightVector[2]/50
        }

        // Create encoder
        const commandEncoder = device.createCommandEncoder();

        renderPassDescriptor.colorAttachments[0].view = ctx.getCurrentTexture().createView()

        device.queue.writeBuffer(worldToCamMatBuffer, 0, mat4.multiply(projectionMat, mat4.inverse(camToWorldMat)))
        device.queue.writeBuffer(tickBuffer, 0, new Uint32Array([tick]))

        // Init pass encoder
        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

        // Do some shit
        passEncoder.setPipeline(renderPipeline);
        passEncoder.setVertexBuffer(0, vertexBuffer);

        passEncoder.setBindGroup(0, bindGroup);

        passEncoder.draw(vertices.length/6);
        passEncoder.end();

        device.queue.submit([commandEncoder.finish()]);

        tick++
    }, 0)
    
}).catch(console.error)
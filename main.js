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

let camPos = [0, 70, 0]
let camRot = [-Math.PI/2, 0, 0]
let keys = {}
let leftClicked = false
let rightClicked = false
let deltaTime = 0

document.addEventListener("mousemove", e => {
    camRot[1] -= e.movementX/500
    camRot[0] -= e.movementY/500
})
document.addEventListener("keydown", e => keys[e.key] = true)
document.addEventListener("keyup", e => keys[e.key] = false)
canvas.addEventListener("mousedown", async e => {
    leftClicked = e.button == 0
    rightClicked = e.button == 2
    canvas.requestPointerLock();
});

const blockSize = 1
const renderDistance = 4
const chunkSize = 16

let chunks = {}
let vArray = []

function createBlockVertices([x, y, z], id, textureSize) {
    id--
    let texYP = id*textureSize+textureSize
    let texYN = id*textureSize

    return {
        // Top
        top: [
            x+blockSize/2,y+blockSize/2,z-blockSize/2,1,
            textureSize,texYN,
            0,1,0,
            x, y, z,

            x-blockSize/2,y+blockSize/2,z+blockSize/2,1,
            0,texYP,
            0,1,0,
            x, y, z,
            
            x+blockSize/2,y+blockSize/2,z+blockSize/2,1,
            textureSize,texYP,
            0,1,0,
            x, y, z,

            x-blockSize/2,y+blockSize/2,z-blockSize/2,1,
            0,texYN,
            0,1,0,
            x, y, z,

            x-blockSize/2,y+blockSize/2,z+blockSize/2,1,
            0,texYP,
            0,1,0,
            x, y, z,
            
            x+blockSize/2,y+blockSize/2,z-blockSize/2,1,
            textureSize,texYN,
            0,1,0,
            x, y, z,
        ],

        // Bottom
        bottom: [
            x+blockSize/2,y-blockSize/2,z+blockSize/2,1,
            textureSize*2,texYN,
            0,-1,0,
            x, y, z,

            x-blockSize/2,y-blockSize/2,z+blockSize/2,1,
            textureSize,texYN,
            0,-1,0,
            x, y, z,
            
            x+blockSize/2,y-blockSize/2,z-blockSize/2,1,
            textureSize*2,texYP,
            0,-1,0,
            x, y, z,

            x-blockSize/2,y-blockSize/2,z-blockSize/2,1,
            textureSize,texYP,
            0,-1,0,
            x, y, z,

            x+blockSize/2,y-blockSize/2,z-blockSize/2,1,
            textureSize*2,texYP,
            0,-1,0,
            x, y, z,
            
            x-blockSize/2,y-blockSize/2,z+blockSize/2,1,
            textureSize,texYN,
            0,-1,0,
            x, y, z,
        ],

        // Front
        front: [
            x-blockSize/2,y+blockSize/2,z+blockSize/2,1,
            textureSize*2,texYN,
            0,0,1,
            x, y, z,

            x+blockSize/2,y-blockSize/2,z+blockSize/2,1,
            textureSize*3,texYP,
            0,0,1,
            x, y, z,
            
            x+blockSize/2,y+blockSize/2,z+blockSize/2,1,
            textureSize*3,texYN,
            0,0,1,
            x, y, z,

            x-blockSize/2,y-blockSize/2,z+blockSize/2,1,
            textureSize*2,texYP,
            0,0,1,
            x, y, z,

            x+blockSize/2,y-blockSize/2,z+blockSize/2,1,
            textureSize*3,texYP,
            0,0,1,
            x, y, z,
            
            x-blockSize/2,y+blockSize/2,z+blockSize/2,1,
            textureSize*2,texYN,
            0,0,1,
            x, y, z,
        ],

        // Right
        right: [
            x+blockSize/2,y-blockSize/2,z+blockSize/2,1,
            textureSize*3,texYP,
            1,0,0,
            x, y, z,

            x+blockSize/2,y+blockSize/2,z-blockSize/2,1,
            textureSize*4,texYN,
            1,0,0,
            x, y, z,
            
            x+blockSize/2,y+blockSize/2,z+blockSize/2,1,
            textureSize*3,texYN,
            1,0,0,
            x, y, z,

            x+blockSize/2,y-blockSize/2,z-blockSize/2,1,
            textureSize*4,texYP,
            1,0,0,
            x, y, z,

            x+blockSize/2,y+blockSize/2,z-blockSize/2,1,
            textureSize*4,texYN,
            1,0,0,
            x, y, z,
            
            x+blockSize/2,y-blockSize/2,z+blockSize/2,1,
            textureSize*3,texYP,
            1,0,0,
            x, y, z,
        ],

        // Back
        back: [
            x+blockSize/2,y-blockSize/2,z-blockSize/2,1,
            textureSize*4,texYP,
            0,0,-1,
            x, y, z,

            x-blockSize/2,y+blockSize/2,z-blockSize/2,1,
            textureSize*5,texYN,
            0,0,-1,
            x, y, z,
            
            x+blockSize/2,y+blockSize/2,z-blockSize/2,1,
            textureSize*4,texYN,
            0,0,-1,
            x, y, z,

            x-blockSize/2,y-blockSize/2,z-blockSize/2,1,
            textureSize*5,texYP,
            0,0,-1,
            x, y, z,

            x-blockSize/2,y+blockSize/2,z-blockSize/2,1,
            textureSize*5,texYN,
            0,0,-1,
            x, y, z,
            
            x+blockSize/2,y-blockSize/2,z-blockSize/2,1,
            textureSize*4,texYP,
            0,0,-1,
            x, y, z,
        ],

        // Left
        left: [
            x-blockSize/2,y+blockSize/2,z-blockSize/2,1,
            textureSize*5,texYN,
            -1,0,0,
            x, y, z,

            x-blockSize/2,y-blockSize/2,z+blockSize/2,1,
            textureSize*6,texYP,
            -1,0,0,
            x, y, z,
            
            x-blockSize/2,y+blockSize/2,z+blockSize/2,1,
            textureSize*6,texYN,
            -1,0,0,
            x, y, z,

            x-blockSize/2,y-blockSize/2,z-blockSize/2,1,
            textureSize*5,texYP,
            -1,0,0,
            x, y, z,

            x-blockSize/2,y-blockSize/2,z+blockSize/2,1,
            textureSize*6,texYP,
            -1,0,0,
            x, y, z,
            
            x-blockSize/2,y+blockSize/2,z-blockSize/2,1,
            textureSize*5,texYN,
            -1,0,0,
            x, y, z,
        ]
    }
}

function updateBlockVertices() {
    vArray = []

    let playerChunk = getBlockChunk(camPos)
    for (let chunkX=-renderDistance/2; chunkX<=renderDistance/2; chunkX++) {
        for (let chunkY=-renderDistance/2; chunkY<=renderDistance/2; chunkY++) {
            if (Math.sqrt(chunkX*chunkX+chunkY*chunkY) > renderDistance/2) continue
            let blockArray = getChunk(chunkX+playerChunk[0], chunkY+playerChunk[1])
            if (!blockArray) continue
            let blockArrayL = getChunk(chunkX+playerChunk[0]-1, chunkY+playerChunk[1])
            let blockArrayR = getChunk(chunkX+playerChunk[0]+1, chunkY+playerChunk[1])
            let blockArrayF = getChunk(chunkX+playerChunk[0], chunkY+playerChunk[1]+1)
            let blockArrayB = getChunk(chunkX+playerChunk[0], chunkY+playerChunk[1]-1)

            for (let y=0; y<blockArray.length; y++) {
                for (let x=0; x<blockArray[y].length; x++) {
                    for (let z=0; z<blockArray[y][x].length; z++) {
                        let id = blockArray[y][x][z]
                        if (id == 0) continue
                        let idU = blockArray[y+1] && blockArray[y+1][x][z]
                        let idD = blockArray[y-1] && blockArray[y-1][x][z]
                        let idR = blockArray[y][x+1] && blockArray[y][x+1][z]
                        let idL = blockArray[y][x-1] && blockArray[y][x-1][z]
                        let idF = blockArray[y][x][z+1]
                        let idB = blockArray[y][x][z-1]

                        if (idR == undefined) idR = blockArrayR && blockArrayR[y].at(0)[z]
                        if (idL == undefined) idL = blockArrayL && blockArrayL[y].at(-1)[z]
                        if (idF == undefined) idF = blockArrayF && blockArrayF[y][x].at(0)
                        if (idB == undefined) idB = blockArrayB && blockArrayB[y][x].at(-1)

                        let blockV = createBlockVertices([x+(chunkX+playerChunk[0])*chunkSize, y, z+(chunkY+playerChunk[1])*chunkSize], id, 16)

                        if (!idU) vArray.push(...blockV.top)
                        if (!idD) vArray.push(...blockV.bottom)
                        if (!idL) vArray.push(...blockV.left)
                        if (!idR) vArray.push(...blockV.right)
                        if (!idF) vArray.push(...blockV.front)
                        if (!idB) vArray.push(...blockV.back)
                    }
                }
            }
        }
    }
}

function GetIntersection(fDst1, fDst2, P1, P2) {
    if ((fDst1 * fDst2) >= 0.0) return;
    if (fDst1 == fDst2) return; 
    return vec3.add(P1, vec3.mul(vec3.sub(P2, P1), (-fDst1/(fDst2-fDst1))));
}

function InBox(Hit, B1, B2, Axis) {
    if (Math.abs(Axis)==1 && Hit[2] > B1[2] && Hit[2] < B2[2] && Hit[1] > B1[1] && Hit[1] < B2[1]) return true;
    if (Math.abs(Axis)==2 && Hit[2] > B1[2] && Hit[2] < B2[2] && Hit[0] > B1[0] && Hit[0] < B2[0]) return true;
    if (Math.abs(Axis)==3 && Hit[0] > B1[0] && Hit[0] < B2[0] && Hit[1] > B1[1] && Hit[1] < B2[1]) return true;
    return false;
}

function getBlockLook(camToWorldMat) {
    let lineDirection = mat4.lookVector(camToWorldMat)

    let minPos
    let minDis = 8
    let face

    let playerChunk = getBlockChunk(camPos)

    for (let chunkX=-1; chunkX<=1; chunkX++) {
        for (let chunkY=-1; chunkY<=1; chunkY++) {
            let cX = chunkX+playerChunk[0]
            let cY = chunkY+playerChunk[1]
            let blockArray = getChunk(cX, cY)
            if (!blockArray) continue

            for (let y=0; y<blockArray.length; y++) {
                if (Math.abs(y-camPos[1]) > 7) continue
                
                for (let x=0; x<blockArray[y].length; x++) {
                    if (Math.abs(x+cX*chunkSize-camPos[0]) > 7) continue
        
                    for (let z=0; z<blockArray[y][x].length; z++) {
                        if (Math.abs(z+cY*chunkSize-camPos[2]) > 7) continue
                        if (vec3.dis([x+cX*chunkSize, y, z+cY*chunkSize], camPos) > 7) continue
        
                        if (blockArray[y][x][z] == 0) continue 
        
                        let L1 = camPos
                        let L2 = vec3.add(camPos, vec3.mul(lineDirection, -12))
        
                        let B1 = [x+cX*chunkSize-0.5, y-0.5, z+cY*chunkSize-0.5]
                        let B2 = [x+cX*chunkSize+0.5, y+0.5, z+cY*chunkSize+0.5]
                        
                        if (L2[0] < B1[0] && L1[0] < B1[0]) continue;
                        if (L2[0] > B2[0] && L1[0] > B2[0]) continue;
                        if (L2[1] < B1[1] && L1[1] < B1[1]) continue;
                        if (L2[1] > B2[1] && L1[1] > B2[1]) continue;
                        if (L2[2] < B1[2] && L1[2] < B1[2]) continue;
                        if (L2[2] > B2[2] && L1[2] > B2[2]) continue;
                        
                        if (L1[0] > B1[0] && L1[0] < B2[0] &&
                            L1[1] > B1[1] && L1[1] < B2[1] &&
                            L1[2] > B1[2] && L1[2] < B2[2]) 
                        {
                            return [[x+cX*chunkSize, y, z+cY*chunkSize], 0];
                        }
                        
                        let hitA = GetIntersection(L1[0]-B1[0], L2[0]-B1[0], L1, L2)
                        let hitB = GetIntersection(L1[1]-B1[1], L2[1]-B1[1], L1, L2) 
                        let hitC = GetIntersection(L1[2]-B1[2], L2[2]-B1[2], L1, L2) 
                        let hitD = GetIntersection(L1[0]-B2[0], L2[0]-B2[0], L1, L2) 
                        let hitE = GetIntersection(L1[1]-B2[1], L2[1]-B2[1], L1, L2) 
                        let hitF = GetIntersection(L1[2]-B2[2], L2[2]-B2[2], L1, L2)
        
                        for (const [hit, f] of [[hitA, 1], [hitB, 2], [hitC, 3], [hitD, -1], [hitE, -2], [hitF, -3]]) {
                            if (hit && InBox(hit, B1, B2, f)) {
                                let dis = vec3.dis(hit, camPos)
                                if (dis < minDis) {
                                    minDis = dis
                                    minPos = [x+cX*chunkSize, y, z+cY*chunkSize]
                                    face = f
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    return [minPos, face]
}

function getChunk(chunkX, chunkY) {
    return chunks[`${chunkX} ${chunkY}`]
}

function getChunkRelPos([x, y, z], [chunkX, chunkY]) {
    return [x-chunkX*chunkSize, y, z-chunkY*chunkSize]
}

function createChunk(chunkX, chunkY) {
    if (getChunk(chunkX, chunkY)) return
    let blockArray = []

    for (let y=0; y<64; y++) {
        let layer = []
        for (let x=0; x<chunkSize; x++) {
            let row = []
            for (let z=0; z<chunkSize; z++) {
                row.push(2)
            }
            layer.push(row)
        }
        blockArray.push(layer)
    }
    let layer = []
    for (let x=0; x<chunkSize; x++) {
        let row = []
        for (let z=0; z<chunkSize; z++) {
            row.push(1)
        }
        layer.push(row)
    }
    blockArray.push(layer)
    for (let y=0; y<64; y++) {
        let layer = []
        for (let x=0; x<chunkSize; x++) {
            let row = []
            for (let z=0; z<chunkSize; z++) {
                row.push(0)
            }
            layer.push(row)
        }
        blockArray.push(layer)
    }

    chunks[`${chunkX} ${chunkY}`] = blockArray
}

function getBlockChunk([x, y, z]) {
    return [Math.floor(x / chunkSize), Math.floor(z / chunkSize)]
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
    
    
    const worldToCamMatBuffer = device.createBuffer({
        size: 64,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    })
    
    const tickBuffer = device.createBuffer({
        size: 8,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    })

    const highligtedBuffer = device.createBuffer({
        size: 32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    })
    
    const diffuseTexture = device.createTexture({
        size: [diffuseImage.width, diffuseImage.height, 1],
        format: "rgba8unorm",
        usage:  GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    })
    
    const depthTexture = device.createTexture({
        size: [canvas.width, canvas.height, 1],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    
    device.queue.copyExternalImageToTexture(
        { source: diffuseImage },
        { texture: diffuseTexture },
        [diffuseImage.width, diffuseImage.height]
    );
        
    // Write test vertices to gpu
    
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
                {
                    shaderLocation: 2, // normal
                    offset: 24,
                    format: "float32x3"
                },
                {
                    shaderLocation: 3, // block location
                    offset: 36,
                    format: "float32x3"
                }
            ],
            arrayStride: 48,
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
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: "less",
            format: "depth24plus",
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
            },
            {
                binding: 3,
                resource: { buffer: highligtedBuffer }
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
        depthStencilAttachment: {
            view: depthTexture.createView(),
            depthClearValue: 1.0,
            depthLoadOp: "clear",
            depthStoreOp: "store",
        },
    };
    
    const projectionMat = mat4.perspective(Math.PI/2, canvas.clientWidth / canvas.clientHeight, 0.1, 2000)

    for (let chunkX=-Math.floor(renderDistance/2); chunkX<Math.floor(renderDistance/2); chunkX++) {
        for (let chunkY=-Math.floor(renderDistance/2); chunkY<Math.floor(renderDistance/2); chunkY++) {
            if (Math.sqrt(chunkX*chunkX+chunkY*chunkY) > renderDistance) continue
            let x = getBlockChunk(camPos)[0] + chunkX
            let y = getBlockChunk(camPos)[1] + chunkY

            createChunk(x, y)
        }
    }
    updateBlockVertices()
    
    let tick = 0
    let lastTime = 0
    setInterval(() => {
        deltaTime = performance.now() - lastTime
        lastTime = performance.now()

        let camToWorldMat = mat4.rotateZYX(mat4.translation(camPos), camRot)

        let [highlightedBlock, face] = getBlockLook(camToWorldMat)

        if (leftClicked) {
            leftClicked = false
            
            if (highlightedBlock) {
                let blockChunk = getBlockChunk(highlightedBlock)
                let block = getChunkRelPos(highlightedBlock, blockChunk)

                getChunk(...blockChunk)[block[1]][block[0]][block[2]] = 0
                updateBlockVertices()
            }
        }
        if (rightClicked) {
            rightClicked = false

            if (highlightedBlock && face) {
                let block

                if (face == -1) block = vec3.add(highlightedBlock, [1, 0, 0])
                if (face == -2) block = vec3.add(highlightedBlock, [0, 1, 0])
                if (face == -3) block = vec3.add(highlightedBlock, [0, 0, 1])
                if (face == 1) block = vec3.add(highlightedBlock, [-1, 0, 0])
                if (face == 2) block = vec3.add(highlightedBlock, [0, -1, 0])
                if (face == 3) block = vec3.add(highlightedBlock, [0, 0, -1])

                let blockChunk = getBlockChunk(block)
                let relBlock = getChunkRelPos(block, blockChunk)

                getChunk(...blockChunk)[relBlock[1]][relBlock[0]][relBlock[2]] = 3
                
                updateBlockVertices()
            }
        }

        const vertices = new Float32Array(vArray)
        const vertexBuffer = device.createBuffer({
            size: vertices.byteLength, // make it big enough to store test vertices in
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        
        device.queue.writeBuffer(vertexBuffer, 0, vertices, 0, vertices.length);     
        
        let oldPos = getBlockChunk(camPos)

        if (keys.w) {
            let lookVector = mat4.lookVector(camToWorldMat)
            camPos[0] -= lookVector[0]/100 * deltaTime
            camPos[1] -= lookVector[1]/100 * deltaTime
            camPos[2] -= lookVector[2]/100 * deltaTime
        }
        if (keys.a) {
            let rightVector = mat4.rightVector(camToWorldMat)
            camPos[0] -= rightVector[0]/100 * deltaTime
            camPos[1] -= rightVector[1]/100 * deltaTime
            camPos[2] -= rightVector[2]/100 * deltaTime
        }
        if (keys.s) {
            let lookVector = mat4.lookVector(camToWorldMat)
            camPos[0] += lookVector[0]/100 * deltaTime
            camPos[1] += lookVector[1]/100 * deltaTime
            camPos[2] += lookVector[2]/100 * deltaTime
        }
        if (keys.d) {
            let rightVector = mat4.rightVector(camToWorldMat)
            camPos[0] += rightVector[0]/100 * deltaTime
            camPos[1] += rightVector[1]/100 * deltaTime
            camPos[2] += rightVector[2]/100 * deltaTime
        }

        if (getBlockChunk(camPos) != oldPos) {
            for (let chunkX=-Math.floor(renderDistance/2); chunkX<Math.floor(renderDistance/2); chunkX++) {
                for (let chunkY=-Math.floor(renderDistance/2); chunkY<Math.floor(renderDistance/2); chunkY++) {
                    if (Math.sqrt(chunkX*chunkX+chunkY*chunkY) > renderDistance) continue
                    let x = getBlockChunk(camPos)[0] + chunkX
                    let y = getBlockChunk(camPos)[1] + chunkY
        
                    createChunk(x, y)
                }
            }
            updateBlockVertices()
        }

        // Create encoder
        const commandEncoder = device.createCommandEncoder();

        renderPassDescriptor.colorAttachments[0].view = ctx.getCurrentTexture().createView()

        device.queue.writeBuffer(worldToCamMatBuffer, 0, mat4.multiply(projectionMat, mat4.inverse(camToWorldMat)))
        device.queue.writeBuffer(tickBuffer, 0, new Uint32Array([tick]))
        if (highlightedBlock) {
            device.queue.writeBuffer(highligtedBuffer, 0, new Int32Array(highlightedBlock))
        } else {
            device.queue.writeBuffer(highligtedBuffer, 0, new Int32Array([0, -Infinity, 0]))
        }

        // Init pass encoder
        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

        // Do some shit
        passEncoder.setPipeline(renderPipeline);
        passEncoder.setVertexBuffer(0, vertexBuffer);

        passEncoder.setBindGroup(0, bindGroup);

        passEncoder.draw(vertices.length/12);
        passEncoder.end();

        device.queue.submit([commandEncoder.finish()]);

        tick++
    }, 0)
    
}).catch(console.error)
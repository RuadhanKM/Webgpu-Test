import mat4 from './mat4.js'
import vec3 from './vec3.js'
import {
    getChunk, 
    getChunkRelPos, 
    getChunkPosFromName, 
    getChunkNameFromPos, 
    chunkInRenderDis, 
    getBlockChunk,
    getChunkBlockIndex,
    createBlockVertices,
    replaceBlock
} from './util.js'
import { 
    renderDistance, 
    chunkSize, 
    blockSize,
    gravity,
    acceleration,
    maxSpeed,
    maxGrav,
    jumpHeight,
    playerSize,
    camHeight
} from './settings.js'

const canvas = document.getElementById("c")
const canvasUi = document.getElementById("cui")
const ctx = canvas.getContext("webgpu")
const ctx2D = canvasUi.getContext("2d")

// Resolve a bunch of promises
function fetchUtils() {
    return new Promise((resolve, reject) => fetch("main.wgsl").then(shaderSourceFile => {
        if (!shaderSourceFile.ok) {reject(Error("Failed to fetch shader, or shader was not found!"))}
        
        let d = new Image()
        d.src = "diffuse.png"
        
        let s = new Image()
        s.src = "specular.png"
        
        let n = new Image()
        n.src = "normal.png"
        
        Promise.all([
            shaderSourceFile.text(), 
            navigator.gpu.requestAdapter(),
            fetch("arm.obj").then(e => e.text()),
            d.decode().then(() => createImageBitmap(d)),
            s.decode().then(() => createImageBitmap(s)),
            n.decode().then(() => createImageBitmap(n))]).then(([shaderSource, adapter, armObj, dImg, sImg, nImg]) => {
            adapter.requestDevice().then(device => resolve([adapter, device, shaderSource, dImg, sImg, nImg, armObj])).catch(reject)
        }).catch(reject)
    }).catch(reject))
}

let playerPos = [0, 20, 0]
let camRot = [0, 0, 0]
let mVel = [0, 0, 0]
let jVel = 0
let gVel = 0

let keys = {}
let leftClicked = false
let rightClicked = false

let deltaTime = 0
let loaded = false
let lastTime = 0
let pPlayerPos = [0,0,0]
let grounded = false
let camUnderwater = false
let bodyUnderwater = false

let noclip = false
let toggledNoclip = false

let tick = 1

let gameLoop

document.addEventListener("mousemove", e => {
    camRot[1] = (camRot[1] - e.movementX/500) % (Math.PI*2)
    camRot[0] = Math.max(Math.min(camRot[0] - e.movementY/500, Math.PI/2.1), -Math.PI/2.1)
})
document.addEventListener("keydown", e => keys[e.key] = true)
document.addEventListener("keyup", e => keys[e.key] = false)
canvasUi.addEventListener("mousedown", async e => {
    leftClicked = e.button == 0
    rightClicked = e.button == 2
    canvasUi.requestPointerLock();
});

let chunks = {}
let vArrays = {}
let visableBlocks = {}

const chunkWorker = new Worker("chunks.js", { type: "module" })

chunkWorker.onmessage = ({data: {message, nVArrays, nVisableBlocks, nChunks}}) => {
    if (message == "verts") {
        vArrays = nVArrays
        visableBlocks = nVisableBlocks

        if (!loaded) {
            loaded = true
            lastTime = performance.now()
            setInterval(gameLoop, 0)
        }
    }
    if (message == "chunks") {
        chunks = nChunks
    }
}

function isPlayerInBlock([x, y, z], playerPos) {
    return (
        (x+0.5 >= playerPos[0]-playerSize[0]/2 && playerPos[0]+playerSize[0]/2 >= x-0.5) && 
        (y+0.5 >= playerPos[1]-playerSize[1]/2 && playerPos[1]+playerSize[1]/2 >= y-0.5) && 
        (z+0.5 >= playerPos[2]-playerSize[2]/2 && playerPos[2]+playerSize[2]/2 >= z-0.5)
    ) 
}

function updateChunksBlockVertices(chunksToUpdate, doSleep) {
    chunkWorker.postMessage({message: "verts", chunksToUpdate: chunksToUpdate, camPos: playerPos, "doSleep": doSleep})
}

function lineToPlane(px,py,pz, ux,uy,uz,  vx,vy,vz, nx,ny,nz) {
    var NdotU = nx*ux + ny*uy + nz*uz;
    if (NdotU == 0) return Infinity;

    // return n.(v-p) / n.u
    return (nx*(vx-px) + ny*(vy-py) + nz*(vz-pz)) / NdotU;
}

function between(x,a,b) {
    return x >= a && x <= b;
}

function sweepAABB(ax,ay,az,ahx,ahy,ahz, bx,by,bz,bhx,bhy,bhz, dx,dy,dz) {
    var mx,my,mz, mhx,mhy,mhz;

    mx = bx - (ax + ahx);
    my = by - (ay + ahy);
    mz = bz - (az + ahz);
    mhx = ahx + bhx;
    mhy = ahy + bhy;
    mhz = ahz + bhz;

    var h = 1, s, nx=0,ny=0,nz=0;
    // X min
    s = lineToPlane(0,0,0, dx,dy,dz, mx,my,mz, -1,0,0);
    if (s >= 0 && dx > 0 && s < h && between(s*dy,my,my+mhy) && between(s*dz,mz,mz+mhz)) 
        {h = s; nx = -1; ny = 0; nz = 0;} 
	
    // X max
    s = lineToPlane(0,0,0, dx,dy,dz, mx+mhx,my,mz, 1,0,0);
    if (s >= 0 && dx < 0 && s < h && between(s*dy,my,my+mhy) && between(s*dz,mz,mz+mhz))
        {h = s; nx =  1; ny = 0; nz = 0;}
	
    // Y min
    s = lineToPlane(0,0,0, dx,dy,dz, mx,my,mz, 0,-1,0);
    if (s >= 0 && dy > 0 && s < h && between(s*dx,mx,mx+mhx) && between(s*dz,mz,mz+mhz))
        {h = s; nx = 0; ny = -1; nz = 0;} 
	
    // Y max
    s = lineToPlane(0,0,0, dx,dy,dz, mx,my+mhy,mz, 0,1,0);
    if (s >= 0 && dy < 0 && s < h && between(s*dx,mx,mx+mhx) && between(s*dz,mz,mz+mhz))
        {h = s; nx = 0; ny =  1; nz = 0;}  
	
    // Z min
    s = lineToPlane(0,0,0, dx,dy,dz, mx,my,mz, 0,0,-1);
    if (s >= 0 && dz > 0 && s < h && between(s*dx,mx,mx+mhx) && between(s*dy,my,my+mhy))
        {h = s; nx = 0; ny = 0; nz = -1;} 
	
    // Z max
    s = lineToPlane(0,0,0, dx,dy,dz, mx,my,mz+mhz, 0,0,1);
    if (s >= 0 && dz < 0 && s < h && between(s*dx,mx,mx+mhx) && between(s*dy,my,my+mhy))
        {h = s; nx = 0; ny = 0; nz =  1;}

    return {h:h, nx:nx, ny:ny, nz:nz};
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

function getBlockLook(origin, lineDirection, maxLen) {
    let minPos
    let minDis = maxLen
    let face
    
    let originChunk = getBlockChunk(origin)
    
    let L1 = origin
    let L2 = vec3.add(origin, vec3.mul(lineDirection, -maxLen))
    
    for (const chunkName in visableBlocks) {
        let [chunkX, chunkY, chunkZ] = getChunkPosFromName(chunkName)

        if (Math.abs(chunkX - originChunk[0]) > 1) continue
        if (Math.abs(chunkY - originChunk[1]) > 1) continue
        if (Math.abs(chunkZ - originChunk[2]) > 1) continue

        for (const [x, y, z] of visableBlocks[chunkName]) {
            if (Math.abs(x-origin[0]) > minDis) continue
            if (Math.abs(y-origin[1]) > minDis) continue
            if (Math.abs(z-origin[2]) > minDis) continue
            if (vec3.dis([x, y, z], origin) > minDis) continue

            let B1 = [x-0.5, y-0.5, z-0.5]
            let B2 = [x+0.5, y+0.5, z+0.5]
            
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
                return [[x, y, z], 0];
            }
            
            let hitA = GetIntersection(L1[0]-B1[0], L2[0]-B1[0], L1, L2)
            let hitB = GetIntersection(L1[1]-B1[1], L2[1]-B1[1], L1, L2) 
            let hitC = GetIntersection(L1[2]-B1[2], L2[2]-B1[2], L1, L2) 
            let hitD = GetIntersection(L1[0]-B2[0], L2[0]-B2[0], L1, L2) 
            let hitE = GetIntersection(L1[1]-B2[1], L2[1]-B2[1], L1, L2) 
            let hitF = GetIntersection(L1[2]-B2[2], L2[2]-B2[2], L1, L2)

            for (const [hit, f] of [[hitA, 1], [hitB, 2], [hitC, 3], [hitD, -1], [hitE, -2], [hitF, -3]]) {
                if (hit && InBox(hit, B1, B2, f)) {
                    let dis = vec3.dis(hit, origin)
                    if (dis < minDis) {
                        minDis = dis
                        minPos = [x, y, z]
                        face = f
                    }
                }
            }
        }
    }

    return [minPos, face]
}

function chunkInView(chunkPos, lookDir) {
    let threshold = -1

    let chunkCenterPos = vec3.sub(vec3.mul(chunkPos, chunkSize), playerPos)
    if (vec3.dot(chunkCenterPos, lookDir) < threshold) return true
    if (vec3.dot(vec3.add(chunkCenterPos, [chunkSize, 0, 0]), lookDir) < threshold) return true
    if (vec3.dot(vec3.add(chunkCenterPos, [0, chunkSize, 0]), lookDir) < threshold) return true
    if (vec3.dot(vec3.add(chunkCenterPos, [0, 0, chunkSize]), lookDir) < threshold) return true
    if (vec3.dot(vec3.add(chunkCenterPos, [chunkSize, chunkSize, 0]), lookDir) < threshold) return true
    if (vec3.dot(vec3.add(chunkCenterPos, [0, chunkSize, chunkSize]), lookDir) < threshold) return true
    if (vec3.dot(vec3.add(chunkCenterPos, [chunkSize, 0, chunkSize]), lookDir) < threshold) return true
    if (vec3.dot(vec3.add(chunkCenterPos, [chunkSize, chunkSize, chunkSize]), lookDir) < threshold) return true
    return false
}

function createChunks(chunksToCreate, doSleep) {
    chunkWorker.postMessage({message: "chunks", chunksToCreate: chunksToCreate, camPos: playerPos, "doSleep": doSleep})
}

fetchUtils().then(([adapter, device, shaderSource, diffuseImage, specularImage, normalImage, armObj]) => {
    // Create shader module
    const shaderModule = device.createShaderModule({
        code: shaderSource,
    });

    // Setup canvas
    ctx.configure({
        device: device,
        format: navigator.gpu.getPreferredCanvasFormat(),
        alphaMode: "premultiplied"
    });
       
    const worldToCamMatBuffer = device.createBuffer({
        size: 64,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    })

    const worldToCamNoRotMatBuffer = device.createBuffer({
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
    
    const camPosBuffer = device.createBuffer({
        size: 32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    })

    const underwaterBuffer = device.createBuffer({
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
    
    const specularTexture = device.createTexture({
        size: [specularImage.width, specularImage.height, 1],
        format: "rgba8unorm",
        usage:  GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    })
    
    const normalTexture = device.createTexture({
        size: [normalImage.width, normalImage.height, 1],
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
    
    device.queue.copyExternalImageToTexture(
        { source: specularImage },
        { texture: specularTexture },
        [specularImage.width, specularImage.height]
    );
    
    device.queue.copyExternalImageToTexture(
        { source: normalImage },
        { texture: normalTexture },
        [normalImage.width, normalImage.height]
    );
        
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
                    shaderLocation: 2, // block location
                    offset: 24,
                    format: "float32x3"
                }, {
                    shaderLocation: 3,
                    offset: 36,
                    format: "float32"
                }
            ],
            arrayStride: 40,
            stepMode: "vertex",
        }
    ];

    let obj = {vertices: [], vArray: [], normals: []};
    let vertexMatches = armObj.match(/^v.+$/gm);
    if (vertexMatches)
    {
        vertexMatches.forEach(vertex =>
        {
            var vertices = vertex.split(" ");
            vertices.shift();
            obj.vertices.push(vertices.map(parseFloat));
        });
    }
    let normalMatches = armObj.match(/^vn.+$/gm);
    if (normalMatches)
    {
        normalMatches.forEach(vertex =>
        {
            var normals = vertex.split(" ");
            normals.shift();
            obj.normals.push(normals.map(parseFloat));
        });
    }
    let faceMatches = armObj.match(/^f.+$/gm);
    if (faceMatches)
    {
        faceMatches.forEach(face =>
        {
            let faces = face.split(" ");
            faces.shift();

            let noramls = faces.map(e => parseFloat(e.split("//")[1]))
            faces = faces.map(e => parseFloat(e.split("//")[0]))

            obj.vArray.push(
                ...obj.vertices[faces[0]-1],1,
                0,0,
                ...obj.normals[noramls[0]-1],
                -2,

                ...obj.vertices[faces[1]-1],1,
                0,0,
                ...obj.normals[noramls[0]-1],
                -2,

                ...obj.vertices[faces[2]-1],1,
                0,0,
                ...obj.normals[noramls[0]-1],
                -2,
            );
        });
    }
    
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
            cullMode: "back"
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
            },
            {
                binding: 4,
                resource: { buffer: camPosBuffer }
            },
            {
                binding: 5,
                resource: specularTexture.createView()
            },
            {
                binding: 6,
                resource: normalTexture.createView()
            },
            {
                binding: 7,
                resource: { buffer: underwaterBuffer }
            },
            {
                binding: 8,
                resource: { buffer: worldToCamNoRotMatBuffer }
            }
        ],
    });
    
    const renderPassDescriptor = {
        colorAttachments: [
            {
                clearValue: { r: 0.53, g: 0.81, b: 0.92, a: 1.0 },
                loadOp: "load",
                storeOp: "store",
                view: undefined,
            },
        ],
        depthStencilAttachment: {
            view: depthTexture.createView(),
            depthClearValue: 1.0,
            depthLoadOp: "clear",
            depthStoreOp: "store",
        },
    };
    
    const projectionMat = mat4.perspective(Math.PI/2, canvas.clientWidth / canvas.clientHeight, 0.1, blockSize*chunkSize*renderDistance/2)

    let camPos = vec3.add(playerPos, [0, camHeight, 0])

    {
        let chunksToCreate = []
        for (let chunkX=-Math.floor(renderDistance/2); chunkX<Math.floor(renderDistance/2); chunkX++) {
            for (let chunkY=-Math.floor(renderDistance/2); chunkY<Math.floor(renderDistance/2); chunkY++) {
                for (let chunkZ=-Math.floor(renderDistance/2); chunkZ<Math.floor(renderDistance/2); chunkZ++) {
                    let x = getBlockChunk(playerPos)[0] + chunkX
                    let y = getBlockChunk(playerPos)[1] + chunkY
                    let z = getBlockChunk(playerPos)[2] + chunkZ
                    if (!chunkInRenderDis(x, y, z, playerPos)) continue
                    
                    chunksToCreate.push([x, y, z])
                }
            }
        }
        createChunks(chunksToCreate)
    }
    
    let fps = 0
    let runningFps = 0

    let moveOffset = [0,0,0]
    let rotOffset = [0,0,0]

    gameLoop = () => {
        deltaTime = Math.min((performance.now() - lastTime) / 1000, 0.2)
        lastTime = performance.now()
        
        runningFps += 1/deltaTime
        if (tick % 15 == 0) {
            fps = Math.round(runningFps/15)
            runningFps = 0
        }

        if (!chunks[getChunkNameFromPos(...getBlockChunk(playerPos))]) return

        ctx2D.reset()

        camPos = vec3.add(playerPos, [0, camHeight, 0])
        
        let camToWorldMat = mat4.rotateZYX(mat4.translation(camPos), camRot)
        let camNoRotToWorldMat = mat4.rotateZYX(mat4.translation(vec3.add([0.3,1.7,-1.8], moveOffset)), vec3.add([0.3, -1.2, 0], rotOffset))
        let lookDir = mat4.lookVector(camToWorldMat)
        let rightDir = mat4.rightVector(camToWorldMat)
        let upDir = mat4.upVector(camToWorldMat)
        
        let [highlightedBlock, face] = getBlockLook(camPos, lookDir, 8)
        
        if (leftClicked) {
            leftClicked = false

            if (!noclip) rotOffset[0] += 1.2
            if (!noclip) moveOffset[1] -= 7

            if (highlightedBlock) {
                chunkWorker.postMessage({"message": "replace", "block": highlightedBlock, "id": 0})

                replaceBlock(chunks, visableBlocks, vArrays, highlightedBlock, 0)
            }
        }
        if (rightClicked) {
            rightClicked = false

            if (!noclip) rotOffset[0] += 1.2
            if (!noclip) moveOffset[1] -= 7

            if (highlightedBlock && face) {
                let block
                
                if (face == -1) block = vec3.add(highlightedBlock, [1, 0, 0])
                if (face == -2) block = vec3.add(highlightedBlock, [0, 1, 0])
                if (face == -3) block = vec3.add(highlightedBlock, [0, 0, 1])
                if (face ==  1) block = vec3.add(highlightedBlock, [-1, 0, 0])
                if (face ==  2) block = vec3.add(highlightedBlock, [0, -1, 0])
                if (face ==  3) block = vec3.add(highlightedBlock, [0, 0, -1])
                
                chunkWorker.postMessage({"message": "replace", "block": block, "id": 3})
                
                if (!isPlayerInBlock(block, playerPos)) {
                    replaceBlock(chunks, visableBlocks, vArrays, block, 3)
                }
            }
        }

        pPlayerPos = [...playerPos]
        
        let oldPos = getBlockChunk(playerPos)
        
        let lookCirclePos = vec3.norm(vec3.sub(lookDir, [0, lookDir[1], 0]))
        let rightCirclePos = vec3.norm(vec3.sub(rightDir, [0, rightDir[1], 0]))

        if (keys.n) {
            if (!toggledNoclip) noclip = !noclip
            toggledNoclip = true
        } else {
            toggledNoclip = false
        }

        if (noclip) {
            playerPos = vec3.add(playerPos, vec3.mul(lookDir, ((keys.s?1:0) - (keys.w?1:0)) * deltaTime * 5))
            playerPos = vec3.add(playerPos, vec3.mul(rightDir, ((keys.d?1:0) - (keys.a?1:0)) * deltaTime * 5))
        } else {
            if (keys.w) {
                mVel[0] -= lookCirclePos[0]*acceleration * deltaTime
                mVel[2] -= lookCirclePos[2]*acceleration * deltaTime
            } else if (vec3.dot(mVel, lookCirclePos) < 0) {
                mVel[0] += lookCirclePos[0]*acceleration * deltaTime
                mVel[2] += lookCirclePos[2]*acceleration * deltaTime
            }
            if (keys.a) {
                mVel[0] -= rightCirclePos[0]*acceleration * deltaTime
                mVel[2] -= rightCirclePos[2]*acceleration * deltaTime
            } else if (vec3.dot(mVel, rightCirclePos) < 0) {
                mVel[0] += rightCirclePos[0]*acceleration * deltaTime
                mVel[2] += rightCirclePos[2]*acceleration * deltaTime 
            }
            if (keys.s) {
                mVel[0] += lookCirclePos[0]*acceleration * deltaTime
                mVel[2] += lookCirclePos[2]*acceleration * deltaTime
            } else if (vec3.dot(mVel, lookCirclePos) > 0) {
                mVel[0] -= lookCirclePos[0]*acceleration * deltaTime
                mVel[2] -= lookCirclePos[2]*acceleration * deltaTime
            }
            if (keys.d) {
                mVel[0] += rightCirclePos[0]*acceleration * deltaTime
                mVel[2] += rightCirclePos[2]*acceleration * deltaTime
            } else if (vec3.dot(mVel, rightCirclePos) > 0) {
                mVel[0] -= rightCirclePos[0]*acceleration * deltaTime
                mVel[2] -= rightCirclePos[2]*acceleration * deltaTime
            }
            if (keys[" "] && (grounded || bodyUnderwater)) {
                gVel = Math.sqrt(2*gravity*(bodyUnderwater ? jumpHeight/20 : jumpHeight))
            }

            gVel -= (bodyUnderwater ? gravity/6 : gravity) * deltaTime
            gVel = Math.max(-(bodyUnderwater ? maxGrav/12 : maxGrav), gVel)
            
            if (vec3.mag(mVel) < acceleration*deltaTime) mVel = [0, 0, 0]
            if (vec3.mag(mVel) > maxSpeed) mVel = vec3.mul(vec3.norm(mVel), maxSpeed)
    
            let pVel = vec3.add(mVel, [0, gVel + jVel, 0])
    
            playerPos = vec3.add(playerPos, vec3.mul(pVel, deltaTime))
            
            grounded = false
    
            for (let MAX_ITER=0; MAX_ITER<1_000; MAX_ITER++) {
                // First we calculate the movement vector for this frame
                // This is the entity's current position minus its last position.
                // The last position is set at the beggining of each frame.
                var dx = playerPos[0] - pPlayerPos[0] 
                var dy = playerPos[1] - pPlayerPos[1]
                var dz = playerPos[2] - pPlayerPos[2]
                
                var r = {h:1, nx:0, ny:0, nz:0};
        
                // For each voxel that may collide with the entity, find the first that colides with it
                let playerChunk = getBlockChunk(playerPos)
                let playerRelPos = vec3.sub(vec3.div(getChunkRelPos(playerPos, playerChunk), chunkSize/2), [1,1,1])
    
                let chunksToCheck = []
                for (let i=(playerRelPos[0]<=-0.5?-1:0); i<=(playerRelPos[0]>=0.5?1:0); i++) {
                    for (let j=(playerRelPos[1]<=-0.5?-1:0); j<=(playerRelPos[1]>=0.5?1:0); j++) {
                        for (let k=(playerRelPos[2]<=-0.5?-1:0); k<=(playerRelPos[2]>=0.5?1:0); k++) {
                            chunksToCheck.push([i, j, k])
                        }
                    }
                }
                
                for (const [chunkX, chunkY, chunkZ] of chunksToCheck.map(e => vec3.add(e, playerChunk))) {
                    let chunkName = getChunkNameFromPos(chunkX, chunkY, chunkZ)
                    if (!visableBlocks[chunkName]) {console.warn("Failed to find chunk for collisions!"); continue}
    
                    for (const [x, y, z] of visableBlocks[chunkName]) {
                        let chunk = getBlockChunk([x, y, z])
                        let [rx, ry, rz] = getChunkRelPos([x, y, z], chunk)
                        let id = chunks[getChunkNameFromPos(...chunk)][ry*chunkSize**2 + rx*chunkSize + rz]
    
                        // Check swept collision
                        var c = sweepAABB(
                            pPlayerPos[0]-playerSize[0]/2, pPlayerPos[1]-playerSize[1]/2, pPlayerPos[2]-playerSize[2]/2, // Player Bottom Left Point
                            playerSize[0], playerSize[1], playerSize[2], // Player Size
                            x-0.5, y-0.5, z-0.5, // Block Bottom Left Point
                            1,1,1, // Block Size
                            dx, dy, dz
                        );
                        
                        if (id == 9) {
                            if (c.h != 1) bodyUnderwater = true
                            //Check if this collision is closer than the closest so far.
                        } else {
                            if (c.h < r.h) r = c
                        };
                    }
                }
    
                // Update the entity's position
                // We move the entity slightly away from the block in order to miss seams.
                var ep = 0.002;
                playerPos[0] = pPlayerPos[0] + r.h*dx + ep*r.nx;
                playerPos[1] = pPlayerPos[1] + r.h*dy + ep*r.ny;
                playerPos[2] = pPlayerPos[2] + r.h*dz + ep*r.nz;
        
                // If there was no collision, end the algorithm.
                if (r.h == 1) break;
    
                if (r.nx != 0) mVel[0] = 0
                if (r.ny != 0) {gVel = 0; jVel = 0}
                if (r.ny > 0) grounded = true
                if (r.nz != 0) mVel[2] = 0
    
                // Wall Sliding
                // c = a - (a.b)/(b.b) b
                // c - slide vector (rejection of a over b)
                // b - normal to the block
                // a - remaining speed (= (1-h)*speed)
                var BdotB = r.nx*r.nx + r.ny*r.ny + r.nz*r.nz;
                if (BdotB != 0) {
                    // Store the current position for the next iteration
                    pPlayerPos[0] = playerPos[0]
                    pPlayerPos[1] = playerPos[1]
                    pPlayerPos[2] = playerPos[2]
        
                    // Apply Slide
                    var AdotB = (1-r.h)*(dx*r.nx + dy*r.ny + dz*r.nz);
    
                    let slideVec = vec3.sub(vec3.mul([dx, dy, dz], 1-r.h), vec3.mul([r.nx, r.ny, r.nz], AdotB/BdotB));
    
                    playerPos = vec3.add(playerPos, slideVec)
                }
                if (MAX_ITER == 999) console.warn("Collision Checks Failed!")
            }

            moveOffset = vec3.lerp(moveOffset, [
                -mVel[2]*Math.cos(camRot[1])*0.07-mVel[0]*Math.sin(camRot[1])*0.07,
                pVel[1]/50, 
                mVel[0]*Math.cos(camRot[1])*0.07-mVel[2]*Math.sin(camRot[1])*0.07,
            ], 0.8)

            rotOffset = vec3.lerp(rotOffset, [0,0,0], 0.2)
        }

        let newPos = getBlockChunk(playerPos)

        bodyUnderwater = false

        for (let x=-Math.ceil(playerSize[0]); x<Math.ceil(playerSize[0]); x++) {
            for (let y=-Math.ceil(playerSize[1]); y<Math.ceil(playerSize[1]); y++) {
                for (let z=-Math.ceil(playerSize[2]); z<Math.ceil(playerSize[2]); z++) {
                    let blockPos = [x+playerPos[0], y+playerPos[1], z+playerPos[2]].map(Math.round)
                    let blockChunk = getBlockChunk(blockPos)
                    let blockRelPos = getChunkRelPos(blockPos, blockChunk)
                    let i = blockRelPos[1]*chunkSize**2 + blockRelPos[0]*chunkSize + blockRelPos[2]

                    
                    let id = chunks[getChunkNameFromPos(...blockChunk)][i]
                    if (id != 9) continue

                    if (isPlayerInBlock(blockPos, playerPos)){
                        bodyUnderwater = true
                        break
                    }
                }
            }
        }
        
        if (oldPos[0] != newPos[0] || oldPos[1] != newPos[1] || oldPos[2] != newPos[2]) {
            let chunksToUpdate = {}
            
            for (const chunkName in visableBlocks) {
                let chunkPos = getChunkPosFromName(chunkName)
                
                if (!chunkInRenderDis(...chunkPos, playerPos)) chunksToUpdate[chunkName] = true
            }
            
            let chunksToCreate = []
            for (let chunkX=-Math.floor(renderDistance/2); chunkX<Math.floor(renderDistance/2); chunkX++) {
                for (let chunkY=-Math.floor(renderDistance/2); chunkY<Math.floor(renderDistance/2); chunkY++) {
                    for (let chunkZ=-Math.floor(renderDistance/2); chunkZ<Math.floor(renderDistance/2); chunkZ++) {
                        let x = newPos[0] + chunkX
                        let y = newPos[1] + chunkY
                        let z = newPos[2] + chunkZ
                        if (vArrays[getChunkNameFromPos(x, y, z)] != undefined) continue
                        if (!chunkInRenderDis(x, y, z, playerPos)) continue

                        chunksToCreate.push([x, y, z])
                        chunksToUpdate[getChunkNameFromPos(x, y, z)] = true
                        chunksToUpdate[getChunkNameFromPos(x+1, y, z)] = true
                        chunksToUpdate[getChunkNameFromPos(x-1, y, z)] = true
                        chunksToUpdate[getChunkNameFromPos(x, y+1, z)] = true
                        chunksToUpdate[getChunkNameFromPos(x, y-1, z)] = true
                        chunksToUpdate[getChunkNameFromPos(x, y, z+1)] = true
                        chunksToUpdate[getChunkNameFromPos(x, y, z-1)] = true
                    }
                }
            }
            createChunks(chunksToCreate, true)
        }

        {
            let cRoundPos = camPos.map(e => Math.round(e))
            let cRoundChunk = getBlockChunk(cRoundPos)
            let cRelPos = getChunkRelPos(cRoundPos, cRoundChunk)
            camUnderwater = chunks[getChunkNameFromPos(...cRoundChunk)][cRelPos[1]*chunkSize**2 + cRelPos[0]*chunkSize + cRelPos[2]] == 9
        }

        renderPassDescriptor.colorAttachments[0].clearValue = camUnderwater ? { r: 0.23, g: 0.31, b: 0.82, a: 1} : { r: 0.53, g: 0.81, b: 0.92, a: 1.0 }
                
        device.queue.writeBuffer(worldToCamMatBuffer, 0, mat4.multiply(projectionMat, mat4.inverse(camToWorldMat)))
        device.queue.writeBuffer(worldToCamNoRotMatBuffer, 0, mat4.multiply(projectionMat, mat4.inverse(camNoRotToWorldMat)))
        device.queue.writeBuffer(tickBuffer, 0, new Uint32Array([tick]))
        if (highlightedBlock) {
            device.queue.writeBuffer(highligtedBuffer, 0, new Int32Array(highlightedBlock))
        } else {
            device.queue.writeBuffer(highligtedBuffer, 0, new Int32Array([camPos[0], camPos[1]-999_999_999, camPos[2]]))
        }
        device.queue.writeBuffer(camPosBuffer, 0, new Float32Array(camPos))
        device.queue.writeBuffer(underwaterBuffer, 0, new Uint32Array([camUnderwater]))
        
        // Init pass encoder
        const commandEncoder = device.createCommandEncoder();

        renderPassDescriptor.colorAttachments[0].view = ctx.getCurrentTexture().createView()
        renderPassDescriptor.colorAttachments[0].loadOp = "clear"

        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(renderPipeline);
        passEncoder.setBindGroup(0, bindGroup);
        
        for (const chunkName in vArrays) {
            if (!chunkInView(getChunkPosFromName(chunkName), lookDir)) continue

            const vArray = vArrays[chunkName].slice()

            const vertexBuffer = device.createBuffer({
                size: vArray.byteLength, // make it big enough to store test vertices in
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            });
            device.queue.writeBuffer(vertexBuffer, 0, vArray, 0, vArray.length);
            
            passEncoder.setVertexBuffer(0, vertexBuffer);
            
            passEncoder.draw(vArray.length/10);
        }

        passEncoder.end()

        renderPassDescriptor.colorAttachments[0].loadOp = "load"

        const handPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        handPassEncoder.setPipeline(renderPipeline);
        handPassEncoder.setBindGroup(0, bindGroup);

        {
            const vArray = new Float32Array(obj.vArray)

            const vertexBuffer = device.createBuffer({
                size: vArray.byteLength, // make it big enough to store test vertices in
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            });
            device.queue.writeBuffer(vertexBuffer, 0, vArray, 0, vArray.length);
            
            handPassEncoder.setVertexBuffer(0, vertexBuffer);
            
            handPassEncoder.draw(vArray.length/10);
        }

        handPassEncoder.end();

        device.queue.submit([commandEncoder.finish()])

        ctx2D.fillStyle = "rgba(255, 255, 255, 0.4)"
        ctx2D.fillRect(canvasUi.width/2-2, canvasUi.height/2-2, 4, 4)

        ctx2D.fillRect(canvasUi.width/2-2, canvasUi.height/2-12, 4, 10)
        ctx2D.fillRect(canvasUi.width/2-2, canvasUi.height/2+2, 4, 10)

        ctx2D.fillRect(canvasUi.width/2-12, canvasUi.height/2-2, 10, 4)
        ctx2D.fillRect(canvasUi.width/2+2, canvasUi.height/2-2, 10, 4)

        ctx2D.font = "30px monospace"
        ctx2D.fillText(fps,20,30)

        tick++
    }
}).catch(console.error)
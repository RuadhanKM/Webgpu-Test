const canvas = document.getElementById("c")
const canvasUi = document.getElementById("cui")
const ctx = canvas.getContext("webgpu")
const ctx2D = canvasUi.getContext("2d")

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

let camPos = [0, 5, 0]
let camRot = [0, 0, 0]
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
canvasUi.addEventListener("mousedown", async e => {
    leftClicked = e.button == 0
    rightClicked = e.button == 2
    canvasUi.requestPointerLock();
});

const blockSize = 1
const renderDistance = 8
const chunkSize = 24
const seed = 21
const caveGridSize = 18
const caveThreshold = 0.8

const gravity = 1.2

let pVel = [0, 0, 0]

const chunks = {}
let vArrays = {}
let visableBlocks = {}

const p = new Array(512);
const permutation = [
    151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140,
    36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234,
    75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237,
    149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48,
    27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105,
    92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73,
    209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86,
    164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38,
    147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189,
    28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101,
    155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232,
    178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12,
    191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31,
    181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254,
    138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215,
    61, 156, 180,
];

for (let i = 0; i < 256; i++) {
    p[256 + i] = p[i] = permutation[i] & seed;
}

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

function updateChunkBlockVertices(chunkX, chunkY, chunkZ) {
    let chunkName = getChunkNameFromPos(chunkX, chunkY, chunkZ)
    if (!chunkInRenderDis(chunkX, chunkY, chunkZ)) {
        delete vArrays[chunkName]
        delete visableBlocks[chunkName]
        return
    }
    let blockArray = getChunk(chunkX, chunkY, chunkZ)
    let vArray = []
    visableBlocks[chunkName] = []

    if (!blockArray) return
    let blockArrayR = getChunk(chunkX+1, chunkY, chunkZ)
    let blockArrayL = getChunk(chunkX-1, chunkY, chunkZ)
    let blockArrayU = getChunk(chunkX, chunkY+1, chunkZ)
    let blockArrayD = getChunk(chunkX, chunkY-1, chunkZ)
    let blockArrayF = getChunk(chunkX, chunkY, chunkZ+1)
    let blockArrayB = getChunk(chunkX, chunkY, chunkZ-1)

    for (let i=0; i<chunkSize**3; i++) {
        let id = blockArray[i]
        if (id == 0) continue

        let y = Math.floor(i / chunkSize**2)
        let x = Math.floor(i / chunkSize) % chunkSize
        let z = i % chunkSize

        let idU = y < chunkSize-1 && blockArray[i + chunkSize**2]
        let idD = y > 0 && blockArray[i - chunkSize**2]
        let idR = x < chunkSize-1 && blockArray[i + chunkSize]
        let idL = x > 0 && blockArray[i - chunkSize]
        let idF = z < chunkSize-1 && blockArray[i + 1]
        let idB = z > 0 && blockArray[i - 1]

        if (idU === false) idU = blockArrayU && blockArrayU[x*chunkSize + z]
        if (idD === false) idD = blockArrayD && blockArrayD[(chunkSize-1)*chunkSize**2 + x*chunkSize + z]
        if (idR === false) idR = blockArrayR && blockArrayR[y*chunkSize**2 + z]
        if (idL === false) idL = blockArrayL && blockArrayL[y*chunkSize**2 + (chunkSize-1)*chunkSize + z]
        if (idF === false) idF = blockArrayF && blockArrayF[y*chunkSize**2 + x*chunkSize]
        if (idB === false) idB = blockArrayB && blockArrayB[y*chunkSize**2 + x*chunkSize + (chunkSize-1)]

        if (idU == 0 || idD == 0 || idL == 0 || idR == 0 || idF == 0 || idB == 0) {
            let block = [x+(chunkX)*chunkSize, y+(chunkY)*chunkSize, z+(chunkZ)*chunkSize]

            let blockV = createBlockVertices(block, id, 16)

            visableBlocks[chunkName].push([x+(chunkX)*chunkSize, y+(chunkY)*chunkSize, z+(chunkZ)*chunkSize])

            if (idU == 0) vArray.push(...blockV.top)
            if (idD == 0) vArray.push(...blockV.bottom)
            if (idL == 0) vArray.push(...blockV.left)
            if (idR == 0) vArray.push(...blockV.right)
            if (idF == 0) vArray.push(...blockV.front)
            if (idB == 0) vArray.push(...blockV.back)
        }
    }

    if (vArray.length > 0) vArrays[chunkName] = new Float32Array(vArray)
}

function updateChunksBlockVertices(chunksToUpdate) {
    let playerChunk = getBlockChunk(camPos)

    if (chunksToUpdate == undefined) {
        vArrays = {}
        visableBlocks = {}
        chunksToUpdate = []
        for (let chunkX=(-renderDistance/2+playerChunk[0]); chunkX<=(renderDistance/2+playerChunk[0]); chunkX++) {
            for (let chunkY=(-renderDistance/2+playerChunk[1]); chunkY<=(renderDistance/2+playerChunk[1]); chunkY++) {
                for (let chunkZ=(-renderDistance/2+playerChunk[2]); chunkZ<=(renderDistance/2+playerChunk[2]); chunkZ++) {
                    if (!chunkInRenderDis(chunkX, chunkY, chunkZ)) continue
                    chunksToUpdate.push([chunkX, chunkY, chunkZ])
                }
            }
        }
    }

    for (const [chunkX, chunkY, chunkZ] of chunksToUpdate) {
        updateChunkBlockVertices(chunkX, chunkY, chunkZ)
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

function getBlockLook(lineDirection) {
    let minPos
    let minDis = 8
    let face
    
    let playerChunk = getBlockChunk(camPos)
    
    let L1 = camPos
    let L2 = vec3.add(camPos, vec3.mul(lineDirection, -12))
    
    for (const chunkName in visableBlocks) {
        let [chunkX, chunkY, chunkZ] = getChunkPosFromName(chunkName)

        if (Math.abs(chunkX - playerChunk[0]) > 1) continue
        if (Math.abs(chunkY - playerChunk[1]) > 1) continue
        if (Math.abs(chunkZ - playerChunk[2]) > 1) continue

        for (const [x, y, z] of visableBlocks[chunkName]) {
            if (Math.abs(x-camPos[0]) > minDis) continue
            if (Math.abs(y-camPos[1]) > minDis) continue
            if (Math.abs(z-camPos[2]) > minDis) continue
            if (vec3.dis([x, y, z], camPos) > minDis) continue

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
                    let dis = vec3.dis(hit, camPos)
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

function getChunk(chunkX, chunkY, chunkZ) {
    return chunks[getChunkNameFromPos(chunkX, chunkY, chunkZ)]
}

function getChunkRelPos([x, y, z], [chunkX, chunkY, chunkZ]) {
    return [x-chunkX*chunkSize, y-chunkY*chunkSize, z-chunkZ*chunkSize]
}

function getChunkPosFromName(chunkName) {
    return chunkName.split(" ").map(x => parseInt(x))
}

function getChunkNameFromPos(chunkX, chunkY, chunkZ) {
    return `${chunkX} ${chunkY} ${chunkZ}`
}

function chunkInRenderDis(chunkX, chunkY, chunkZ) {
    let playerChunk = getBlockChunk(camPos)
    return Math.sqrt((chunkX-playerChunk[0])**2+(chunkY-playerChunk[1])**2+(chunkZ-playerChunk[2])**2) < renderDistance/2
}

function chunkInView(chunkPos, lookDir) {
    let threshold = -2

    let chunkCenterPos = vec3.sub(vec3.mul(chunkPos, chunkSize), camPos)
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

function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
};

function lerp(t, a, b) {
    return a + t * (b - a);
}

function grad(hash, x, y, z) {
    const h = hash & 15
    const u = h < 8 ? x : y
    const v = h < 4 ? y : h == 12 || h == 14 ? x : z
    return ((h & 1) == 0 ? u : -u) + ((h & 2) == 0 ? v : -v)
}

function perlinNoise(x, y, z) {
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    const Z = Math.floor(z) & 255
    
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = fade(x)
    const v = fade(y)
    const w = fade(z)
    const A = p[X] + Y
    const AA = p[A] + Z
    const AB = p[A + 1] + Z
    const B = p[X + 1] + Y
    const BA = p[B] + Z
    const BB = p[B + 1] + Z

    return lerp(
        w,
        lerp(
            v,
            lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)),
            lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))
        ),
        lerp(
            v,
            lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)),
            lerp(
                u,
                grad(p[AB + 1], x, y - 1, z - 1),
                grad(p[BB + 1], x - 1, y - 1, z - 1)
            )
        )
    );
}

function mulberry32(a) {
    var t = a + 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
}

let cellCache = {}
function cellNoise(x, y, z) {
    let minDis = Infinity
    let bc = vec3.div([x, y, z], caveGridSize).map(Math.round)
    if (cellCache[bc]) {
        for (const p of cellCache[bc]) {
            let dis = vec3.dis(p, [x, y, z])
            if (dis < minDis) minDis = dis
        }
    } else {
        cellCache[bc] = []
        for (let ox=-1; ox<=1; ox++) {
            for (let oy=-1; oy<=1; oy++) {
                for (let oz=-1; oz<=1; oz++) {
                    let chunk = vec3.add(bc, [ox, oy, oz])
                    let r = mulberry32(chunk[0])*1000+mulberry32([chunk[1]])*1000+mulberry32([chunk[2]])

                    let rx = mulberry32(r*1000)
                    let ry = mulberry32(rx*1000)
                    let rz = mulberry32(ry*1000)

                    let p = [(chunk[0]+rx)*caveGridSize, (chunk[1]+ry)*caveGridSize, (chunk[2]+rz)*caveGridSize]

                    cellCache[bc].push(p)

                    let dis = vec3.dis(p, [x, y, z])
                    if (dis < minDis) minDis = dis
                }
            }
        }
    }
    return minDis
}

let airChunk = new Uint16Array(chunkSize**3)

for (let i=0; i<chunkSize**3; i++) {
    airChunk[i] = 0
}

function createChunk(chunkX, chunkY, chunkZ) {
    if (getChunk(chunkX, chunkY, chunkZ)) return
    if (chunkY > Math.ceil(124/chunkSize)) {
        chunks[getChunkNameFromPos(chunkX, chunkY, chunkZ)] = airChunk.slice()
        return
    }
    let blockArray = new Uint16Array(chunkSize**3)

    for (let i=0; i<chunkSize**3; i++) {
        let y = Math.floor(i / chunkSize**2) + chunkY*chunkSize
        let x = Math.floor(i / chunkSize) % chunkSize + chunkX*chunkSize
        let z = i % chunkSize + chunkZ*chunkSize
        
        let height = Math.round(perlinNoise(x/250, 0, z/250) * 80 * (perlinNoise(x/300, 0, z/300) + 0.3)) + Math.round(perlinNoise(x/30, 0, z/30) * 20 * perlinNoise(x/300, 0, z/300))

        blockArray[i] = (cellNoise(x, y, z) < caveGridSize*caveThreshold) ? (y < height-5 ? 2 : y == height ? 1 : y < height ? 4 : 0) : 0
    }

    chunks[getChunkNameFromPos(chunkX, chunkY, chunkZ)] = blockArray
}

function getBlockChunk([x, y, z]) {
    return [Math.floor(x / chunkSize), Math.floor(y / chunkSize), Math.floor(z / chunkSize)]
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
            }
        ],
    });
    
    const renderPassDescriptor = {
        colorAttachments: [
            {
                clearValue: { r: 0.53, g: 0.81, b: 0.92, a: 1.0 },
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
            for (let chunkZ=-Math.floor(renderDistance/2); chunkZ<Math.floor(renderDistance/2); chunkZ++) {
                let x = getBlockChunk(camPos)[0] + chunkX
                let y = getBlockChunk(camPos)[1] + chunkY
                let z = getBlockChunk(camPos)[2] + chunkZ
                if (!chunkInRenderDis(x, y, z)) continue
            
                createChunk(x, y, z)
            }
        }
    }
    updateChunksBlockVertices()
    
    let tick = 1
    let lastTime = 0
    let fps = 0
    let runningFps = 0
    setInterval(() => {
        deltaTime = performance.now() - lastTime
        lastTime = performance.now()
        
        ctx2D.reset()
        
        runningFps += 1/deltaTime*1000
        if (tick % 15 == 0) {
            fps = Math.round(runningFps/15)
            runningFps = 0
        }
        
        let camToWorldMat = mat4.rotateZYX(mat4.translation(camPos), camRot)
        let lookDir = mat4.lookVector(camToWorldMat)
        
        let [highlightedBlock, face] = getBlockLook(lookDir)
        
        if (leftClicked) {
            leftClicked = false

            if (highlightedBlock) {
                let blockChunk = getBlockChunk(highlightedBlock)
                let block = getChunkRelPos(highlightedBlock, blockChunk)
                
                getChunk(...blockChunk)[block[1]*chunkSize**2 + block[0]*chunkSize + block[2]] = 0

                if (block[0] == 0          ) updateChunkBlockVertices(blockChunk[0]-1, blockChunk[1],   blockChunk[2]  )
                if (block[0] == chunkSize-1) updateChunkBlockVertices(blockChunk[0]+1, blockChunk[1],   blockChunk[2]  )
                if (block[1] == 0          ) updateChunkBlockVertices(blockChunk[0],   blockChunk[1]-1, blockChunk[2]  )
                if (block[1] == chunkSize-1) updateChunkBlockVertices(blockChunk[0],   blockChunk[1]+1, blockChunk[2]  )
                if (block[2] == 0          ) updateChunkBlockVertices(blockChunk[0],   blockChunk[1],   blockChunk[2]-1)
                if (block[2] == chunkSize-1) updateChunkBlockVertices(blockChunk[0],   blockChunk[1],   blockChunk[2]+1)

                updateChunkBlockVertices(...blockChunk)
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

                getChunk(...blockChunk)[relBlock[1]*chunkSize**2 + relBlock[0]*chunkSize + relBlock[2]] = 3
                
                if (block[0] == 0          ) updateChunkBlockVertices(blockChunk[0]-1, blockChunk[1],   blockChunk[2]  )
                if (block[0] == chunkSize-1) updateChunkBlockVertices(blockChunk[0]+1, blockChunk[1],   blockChunk[2]  )
                if (block[1] == 0          ) updateChunkBlockVertices(blockChunk[0],   blockChunk[1]-1, blockChunk[2]  )
                if (block[1] == chunkSize-1) updateChunkBlockVertices(blockChunk[0],   blockChunk[1]+1, blockChunk[2]  )
                if (block[2] == 0          ) updateChunkBlockVertices(blockChunk[0],   blockChunk[1],   blockChunk[2]-1)
                if (block[2] == chunkSize-1) updateChunkBlockVertices(blockChunk[0],   blockChunk[1],   blockChunk[2]+1)
                
                updateChunkBlockVertices(...blockChunk)
            }
        }
        
        let oldPos = getBlockChunk(camPos)
        
        if (keys.w) {
            camPos[0] -= lookDir[0]/100 * deltaTime
            camPos[1] -= lookDir[1]/100 * deltaTime
            camPos[2] -= lookDir[2]/100 * deltaTime
        }
        if (keys.a) {
            let rightVector = mat4.rightVector(camToWorldMat)
            camPos[0] -= rightVector[0]/100 * deltaTime
            camPos[1] -= rightVector[1]/100 * deltaTime
            camPos[2] -= rightVector[2]/100 * deltaTime
        }
        if (keys.s) {
            camPos[0] += lookDir[0]/100 * deltaTime
            camPos[1] += lookDir[1]/100 * deltaTime
            camPos[2] += lookDir[2]/100 * deltaTime
        }
        if (keys.d) {
            let rightVector = mat4.rightVector(camToWorldMat)
            camPos[0] += rightVector[0]/100 * deltaTime
            camPos[1] += rightVector[1]/100 * deltaTime
            camPos[2] += rightVector[2]/100 * deltaTime
        }
        
        let newPos = getBlockChunk(camPos)
        
        if (oldPos[0] != newPos[0] || oldPos[1] != newPos[1] || oldPos[2] != newPos[2]) {
            let chunksToUpdate = {}
            
            for (const chunkName in visableBlocks) {
                let chunkPos = getChunkPosFromName(chunkName)
                
                if (!chunkInRenderDis(...chunkPos)) updateChunkBlockVertices(...chunkPos)
            }
            
            for (let chunkX=-Math.floor(renderDistance/2); chunkX<Math.floor(renderDistance/2); chunkX++) {
                for (let chunkY=-Math.floor(renderDistance/2); chunkY<Math.floor(renderDistance/2); chunkY++) {
                    for (let chunkZ=-Math.floor(renderDistance/2); chunkZ<Math.floor(renderDistance/2); chunkZ++) {
                        let x = newPos[0] + chunkX
                        let y = newPos[1] + chunkY
                        let z = newPos[2] + chunkZ
                        if (vArrays[getChunkNameFromPos(x, y, z)] != undefined) continue
                        if (!chunkInRenderDis(x, y, z)) continue

                        createChunk(x, y, z)
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

            updateChunksBlockVertices(Object.keys(chunksToUpdate).map(getChunkPosFromName))
        }
        
        // Create encoder
        const commandEncoder = device.createCommandEncoder();
        renderPassDescriptor.colorAttachments[0].view = ctx.getCurrentTexture().createView()
        
        device.queue.writeBuffer(worldToCamMatBuffer, 0, mat4.multiply(projectionMat, mat4.inverse(camToWorldMat)))
        device.queue.writeBuffer(tickBuffer, 0, new Uint32Array([tick]))
        if (highlightedBlock) {
            device.queue.writeBuffer(highligtedBuffer, 0, new Int32Array(highlightedBlock))
        } else {
            device.queue.writeBuffer(highligtedBuffer, 0, new Int32Array([0, -1, 0]))
        }
        
        // Init pass encoder
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
            
            passEncoder.draw(vArray.length/12);
        }
        
        passEncoder.end();
        device.queue.submit([commandEncoder.finish()]);

        ctx2D.fillStyle = "rgba(255, 255, 255, 0.4)"
        ctx2D.fillRect(canvasUi.width/2-2, canvasUi.height/2-10, 4, 20)
        ctx2D.fillRect(canvasUi.width/2-10, canvasUi.height/2-2, 20, 4)

        ctx2D.font = "30px monospace"
        ctx2D.fillText(fps,20,30)

        tick++
    }, 0)
    
}).catch(console.error)
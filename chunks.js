import vec3 from './vec3.js'
import { 
    seed, 
    chunkSize,
    renderDistance,
    caveGridSize, 
    caveThreshold,
    blockSize
} from './settings.js'
import {
    getChunk, 
    getChunkRelPos, 
    getChunkPosFromName, 
    getChunkNameFromPos, 
    chunkInRenderDis, 
    getBlockChunk
} from './util.js'

onmessage = ({data: {message, chunksToUpdate, chunksToCreate, camPos, block, id}}) => {
    if (message == "verts") {
        updateChunksBlockVertices(chunksToUpdate, camPos)
    }
    if (message == "chunks") {
        createChunks(chunksToCreate)
    }
    if (message == "replace") {
        let chunk = getBlockChunk(block)
        let relPos = getChunkRelPos(block, chunk)

        chunks[getChunkNameFromPos(...chunk)][relPos[1]*chunkSize**2 + relPos[0]*chunkSize + relPos[2]] = id

        let chunksToUpdate = [chunk]

        if (relPos[0] == 0)             chunksToUpdate.push(vec3.add(chunk, [-1, 0, 0]))
        if (relPos[0] == chunkSize-1)   chunksToUpdate.push(vec3.add(chunk, [1, 0, 0]))
        if (relPos[1] == 0)             chunksToUpdate.push(vec3.add(chunk, [0, -1, 0]))
        if (relPos[1] == chunkSize-1)   chunksToUpdate.push(vec3.add(chunk, [0, 1, 0]))
        if (relPos[2] == 0)             chunksToUpdate.push(vec3.add(chunk, [0, 0, -1]))
        if (relPos[2] == chunkSize-1)   chunksToUpdate.push(vec3.add(chunk, [0, 0, 1]))

        updateChunksBlockVertices(chunksToUpdate, block)
    }
}

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
            x, y, z,
            
            x-blockSize/2,y+blockSize/2,z+blockSize/2,1,
            0,texYP,
            x, y, z,
            
            x+blockSize/2,y+blockSize/2,z+blockSize/2,1,
            textureSize,texYP,
            x, y, z,
            
            x-blockSize/2,y+blockSize/2,z-blockSize/2,1,
            0,texYN,
            x, y, z,
            
            x-blockSize/2,y+blockSize/2,z+blockSize/2,1,
            0,texYP,
            x, y, z,
            
            x+blockSize/2,y+blockSize/2,z-blockSize/2,1,
            textureSize,texYN,
            x, y, z,
        ],
        
        // Bottom
        bottom: [
            x+blockSize/2,y-blockSize/2,z+blockSize/2,1,
            textureSize*2,texYN,
            
            x, y, z,
            
            x-blockSize/2,y-blockSize/2,z+blockSize/2,1,
            textureSize,texYN,
            
            x, y, z,
            
            x+blockSize/2,y-blockSize/2,z-blockSize/2,1,
            textureSize*2,texYP,
            
            x, y, z,
            
            x-blockSize/2,y-blockSize/2,z-blockSize/2,1,
            textureSize,texYP,
            
            x, y, z,
            
            x+blockSize/2,y-blockSize/2,z-blockSize/2,1,
            textureSize*2,texYP,
            
            x, y, z,
            
            x-blockSize/2,y-blockSize/2,z+blockSize/2,1,
            textureSize,texYN,
            
            x, y, z,
        ],
        
        // Front
        front: [
            x-blockSize/2,y+blockSize/2,z+blockSize/2,1,
            textureSize*2,texYN,
            x, y, z,
            
            x+blockSize/2,y-blockSize/2,z+blockSize/2,1,
            textureSize*3,texYP,
            x, y, z,
            
            x+blockSize/2,y+blockSize/2,z+blockSize/2,1,
            textureSize*3,texYN,
            x, y, z,
            
            x-blockSize/2,y-blockSize/2,z+blockSize/2,1,
            textureSize*2,texYP,
            x, y, z,
            
            x+blockSize/2,y-blockSize/2,z+blockSize/2,1,
            textureSize*3,texYP,
            x, y, z,
            
            x-blockSize/2,y+blockSize/2,z+blockSize/2,1,
            textureSize*2,texYN,
            x, y, z,
        ],
        
        // Right
        right: [
            x+blockSize/2,y-blockSize/2,z+blockSize/2,1,
            textureSize*3,texYP,
            x, y, z,
            
            x+blockSize/2,y+blockSize/2,z-blockSize/2,1,
            textureSize*4,texYN,
            x, y, z,
            
            x+blockSize/2,y+blockSize/2,z+blockSize/2,1,
            textureSize*3,texYN,
            x, y, z,
            
            x+blockSize/2,y-blockSize/2,z-blockSize/2,1,
            textureSize*4,texYP,
            x, y, z,

            x+blockSize/2,y+blockSize/2,z-blockSize/2,1,
            textureSize*4,texYN,
            x, y, z,
            
            x+blockSize/2,y-blockSize/2,z+blockSize/2,1,
            textureSize*3,texYP,
            x, y, z,
        ],
        
        // Back
        back: [
            x+blockSize/2,y-blockSize/2,z-blockSize/2,1,
            textureSize*4,texYP,
            
            x, y, z,
            
            x-blockSize/2,y+blockSize/2,z-blockSize/2,1,
            textureSize*5,texYN,
            
            x, y, z,
            
            x+blockSize/2,y+blockSize/2,z-blockSize/2,1,
            textureSize*4,texYN,
            
            x, y, z,
            
            x-blockSize/2,y-blockSize/2,z-blockSize/2,1,
            textureSize*5,texYP,
            
            x, y, z,
            
            x-blockSize/2,y+blockSize/2,z-blockSize/2,1,
            textureSize*5,texYN,
            
            x, y, z,
            
            x+blockSize/2,y-blockSize/2,z-blockSize/2,1,
            textureSize*4,texYP,
            
            x, y, z,
        ],
        
        // Left
        left: [
            x-blockSize/2,y+blockSize/2,z-blockSize/2,1,
            textureSize*5,texYN,
            
            x, y, z,
            
            x-blockSize/2,y-blockSize/2,z+blockSize/2,1,
            textureSize*6,texYP,
            
            x, y, z,
            
            x-blockSize/2,y+blockSize/2,z+blockSize/2,1,
            textureSize*6,texYN,
            
            x, y, z,
            
            x-blockSize/2,y-blockSize/2,z-blockSize/2,1,
            textureSize*5,texYP,
            
            x, y, z,
            
            x-blockSize/2,y-blockSize/2,z+blockSize/2,1,
            textureSize*6,texYP,
            
            x, y, z,
            
            x-blockSize/2,y+blockSize/2,z-blockSize/2,1,
            textureSize*5,texYN,
            
            x, y, z,
        ]
    }
}

let airChunk

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
    a += 0x6D2B79F5;
    a = Math.imul(a ^ a >>> 15, a | 1);
    a ^= a + Math.imul(a ^ a >>> 7, a | 61);
    return ((a ^ a >>> 14) >>> 0) / 4294967296;
}

let cellCache = {}
function cellNoise(x, y, z) {
    let minDis = Infinity
    let bc = vec3.div([x, y, z], caveGridSize).map(Math.round)

    let dis
    let p
    let rx
    let ry
    let rz
    let chunk
    let r
    let ox
    let oy
    let oz

    if (cellCache[bc]) {
        for (const p of cellCache[bc]) {
            dis = vec3.dis(p, [x, y, z])
            if (dis < minDis) minDis = dis
        }
    } else {
        cellCache[bc] = []
        for (ox=-1; ox<=1; ox++) {
            for (oy=-1; oy<=1; oy++) {
                for (oz=-1; oz<=1; oz++) {
                    chunk = vec3.add(bc, [ox, oy, oz])
                    r = mulberry32(chunk[0])*1000+mulberry32([chunk[1]])*1000+mulberry32([chunk[2]])

                    rx = mulberry32(r*1000)
                    ry = mulberry32(rx*1000)
                    rz = mulberry32(ry*1000)

                    p = [(chunk[0]+rx)*caveGridSize, (chunk[1]+ry)*caveGridSize, (chunk[2]+rz)*caveGridSize]

                    cellCache[bc].push(p)

                    dis = vec3.dis(p, [x, y, z])
                    if (dis < minDis) minDis = dis
                }
            }
        }
    }
    return minDis
}

function createChunk(chunkX, chunkY, chunkZ) {
    if (getChunk(chunkX, chunkY, chunkZ, chunks)) return
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

        blockArray[i] = (cellNoise(x, y, z) < caveGridSize*caveThreshold) ? (y < height-5 ? (perlinNoise(x/10, y/10, z/10) < 0.4 ? 2 : 5) : y == height ? 1 : y < height ? 4 : 0) : 0
    }

    chunks[getChunkNameFromPos(chunkX, chunkY, chunkZ)] = blockArray
}

function createChunks(chunksToCreate) {
    for (const chunk of chunksToCreate) {
        createChunk(...chunk)
    }

    postMessage({message: "chunks", chunks: chunks})
}

function updateChunkBlockVertices(chunkX, chunkY, chunkZ, camPos) {
    let chunkName = getChunkNameFromPos(chunkX, chunkY, chunkZ)
    if (!chunkInRenderDis(chunkX, chunkY, chunkZ, camPos)) {
        delete vArrays[chunkName]
        delete visableBlocks[chunkName]
        return
    }
    let blockArray = getChunk(chunkX, chunkY, chunkZ, chunks)
    let vArray = []
    visableBlocks[chunkName] = []

    if (!blockArray) return
    let blockArrayR = getChunk(chunkX+1, chunkY, chunkZ, chunks)
    let blockArrayL = getChunk(chunkX-1, chunkY, chunkZ, chunks)
    let blockArrayU = getChunk(chunkX, chunkY+1, chunkZ, chunks)
    let blockArrayD = getChunk(chunkX, chunkY-1, chunkZ, chunks)
    let blockArrayF = getChunk(chunkX, chunkY, chunkZ+1, chunks)
    let blockArrayB = getChunk(chunkX, chunkY, chunkZ-1, chunks)

    let id
    let x
    let y
    let z
    let idU
    let idD
    let idR
    let idL
    let idF
    let idB
    let block
    let blockV

    for (let i=0; i<chunkSize**3; i++) {
        id = blockArray[i]
        if (id == 0) continue

        y = Math.floor(i / chunkSize**2)
        x = Math.floor(i / chunkSize) % chunkSize
        z = i % chunkSize

        idU = y < chunkSize-1 && blockArray[i + chunkSize**2]
        idD = y > 0 && blockArray[i - chunkSize**2]
        idR = x < chunkSize-1 && blockArray[i + chunkSize]
        idL = x > 0 && blockArray[i - chunkSize]
        idF = z < chunkSize-1 && blockArray[i + 1]
        idB = z > 0 && blockArray[i - 1]

        if (idU === false) idU = blockArrayU && blockArrayU[x*chunkSize + z]
        if (idD === false) idD = blockArrayD && blockArrayD[(chunkSize-1)*chunkSize**2 + x*chunkSize + z]
        if (idR === false) idR = blockArrayR && blockArrayR[y*chunkSize**2 + z]
        if (idL === false) idL = blockArrayL && blockArrayL[y*chunkSize**2 + (chunkSize-1)*chunkSize + z]
        if (idF === false) idF = blockArrayF && blockArrayF[y*chunkSize**2 + x*chunkSize]
        if (idB === false) idB = blockArrayB && blockArrayB[y*chunkSize**2 + x*chunkSize + (chunkSize-1)]

        if (idU == 0 || idD == 0 || idL == 0 || idR == 0 || idF == 0 || idB == 0) {
            block = [x+(chunkX)*chunkSize, y+(chunkY)*chunkSize, z+(chunkZ)*chunkSize]

            blockV = createBlockVertices(block, id, 16)

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

function updateChunksBlockVertices(chunksToUpdate, camPos) {
    let playerChunk = getBlockChunk(camPos)

    if (chunksToUpdate == undefined) {
        vArrays = {}
        visableBlocks = {}
        chunksToUpdate = []
        for (let chunkX=(-renderDistance/2+playerChunk[0]); chunkX<=(renderDistance/2+playerChunk[0]); chunkX++) {
            for (let chunkY=(-renderDistance/2+playerChunk[1]); chunkY<=(renderDistance/2+playerChunk[1]); chunkY++) {
                for (let chunkZ=(-renderDistance/2+playerChunk[2]); chunkZ<=(renderDistance/2+playerChunk[2]); chunkZ++) {
                    if (!chunkInRenderDis(chunkX, chunkY, chunkZ, camPos)) continue
                    chunksToUpdate.push([chunkX, chunkY, chunkZ])
                }
            }
        }
    }

    for (const [chunkX, chunkY, chunkZ] of chunksToUpdate) {
        updateChunkBlockVertices(chunkX, chunkY, chunkZ, camPos)
    }

    postMessage({message: "verts", nVArrays: vArrays, nVisableBlocks: visableBlocks})
}
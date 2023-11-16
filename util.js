import { chunkSize, renderDistance, blockSize } from "./settings.js"
import vec3 from "./vec3.js"

export function getChunk(chunkX, chunkY, chunkZ, chunks) {
    return chunks[getChunkNameFromPos(chunkX, chunkY, chunkZ)]
}

export function getChunkRelPos([x, y, z], [chunkX, chunkY, chunkZ]) {
    return [x-chunkX*chunkSize, y-chunkY*chunkSize, z-chunkZ*chunkSize]
}

export function getChunkPosFromName(chunkName) {
    return chunkName.split(" ").map(x => parseInt(x))
}

export function getChunkNameFromPos(chunkX, chunkY, chunkZ) {
    return `${chunkX} ${chunkY} ${chunkZ}`
}

export function chunkInRenderDis(chunkX, chunkY, chunkZ, camPos) {
    let playerChunk = getBlockChunk(camPos)
    return Math.sqrt((chunkX-playerChunk[0])**2+(chunkY-playerChunk[1])**2+(chunkZ-playerChunk[2])**2) < renderDistance/2
}

export function getBlockChunk([x, y, z]) {
    return [Math.floor(x / chunkSize), Math.floor(y / chunkSize), Math.floor(z / chunkSize)]
}

export function getChunkBlockIndex(block, chunk) {
    let relPos = getChunkRelPos(block, chunk)
    return relPos[1]*chunkSize**2 + relPos[0]*chunkSize + relPos[2]
}

export function createBlockVertices([x, y, z], id, textureSize) {
    id--
    let texYP = id*textureSize+textureSize
    let texYN = id*textureSize
    
    return {
        // Top
        top: [
            x+blockSize/2,y+blockSize/2,z-blockSize/2,1,
            textureSize,texYN,
            x, y, z,
            id,
            
            x-blockSize/2,y+blockSize/2,z+blockSize/2,1,
            0,texYP,
            x, y, z,
            id,
            
            x+blockSize/2,y+blockSize/2,z+blockSize/2,1,
            textureSize,texYP,
            x, y, z,
            id,
            
            x-blockSize/2,y+blockSize/2,z-blockSize/2,1,
            0,texYN,
            x, y, z,
            id,
            
            x-blockSize/2,y+blockSize/2,z+blockSize/2,1,
            0,texYP,
            x, y, z,
            id,
            
            x+blockSize/2,y+blockSize/2,z-blockSize/2,1,
            textureSize,texYN,
            x, y, z,
            id,
        ],
        
        // Bottom
        bottom: [
            x+blockSize/2,y-blockSize/2,z+blockSize/2,1,
            textureSize*2,texYN,
            x, y, z,
            id,
            
            x-blockSize/2,y-blockSize/2,z+blockSize/2,1,
            textureSize,texYN,
            x, y, z,
            id,
            
            x+blockSize/2,y-blockSize/2,z-blockSize/2,1,
            textureSize*2,texYP,
            x, y, z,
            id,
            
            x-blockSize/2,y-blockSize/2,z-blockSize/2,1,
            textureSize,texYP,
            x, y, z,
            id,
            
            x+blockSize/2,y-blockSize/2,z-blockSize/2,1,
            textureSize*2,texYP,
            x, y, z,
            id,
            
            x-blockSize/2,y-blockSize/2,z+blockSize/2,1,
            textureSize,texYN,
            x, y, z,
            id,
        ],
        
        // Front
        front: [
            x-blockSize/2,y+blockSize/2,z+blockSize/2,1,
            textureSize*2,texYN,
            x, y, z,
            id,
            
            x+blockSize/2,y-blockSize/2,z+blockSize/2,1,
            textureSize*3,texYP,
            x, y, z,
            id,
            
            x+blockSize/2,y+blockSize/2,z+blockSize/2,1,
            textureSize*3,texYN,
            x, y, z,
            id,
            
            x-blockSize/2,y-blockSize/2,z+blockSize/2,1,
            textureSize*2,texYP,
            x, y, z,
            id,
            
            x+blockSize/2,y-blockSize/2,z+blockSize/2,1,
            textureSize*3,texYP,
            x, y, z,
            id,
            
            x-blockSize/2,y+blockSize/2,z+blockSize/2,1,
            textureSize*2,texYN,
            x, y, z,
            id,
        ],
        
        // Right
        right: [
            x+blockSize/2,y-blockSize/2,z+blockSize/2,1,
            textureSize*3,texYP,
            x, y, z,
            id,
            
            x+blockSize/2,y+blockSize/2,z-blockSize/2,1,
            textureSize*4,texYN,
            x, y, z,
            id,
            
            x+blockSize/2,y+blockSize/2,z+blockSize/2,1,
            textureSize*3,texYN,
            x, y, z,
            id,
            
            x+blockSize/2,y-blockSize/2,z-blockSize/2,1,
            textureSize*4,texYP,
            x, y, z,
            id,

            x+blockSize/2,y+blockSize/2,z-blockSize/2,1,
            textureSize*4,texYN,
            x, y, z,
            id,
            
            x+blockSize/2,y-blockSize/2,z+blockSize/2,1,
            textureSize*3,texYP,
            x, y, z,
            id,
        ],
        
        // Back
        back: [
            x+blockSize/2,y-blockSize/2,z-blockSize/2,1,
            textureSize*4,texYP,
            x, y, z,
            id,
            
            x-blockSize/2,y+blockSize/2,z-blockSize/2,1,
            textureSize*5,texYN,
            x, y, z,
            id,
            
            x+blockSize/2,y+blockSize/2,z-blockSize/2,1,
            textureSize*4,texYN,
            x, y, z,
            id,
            
            x-blockSize/2,y-blockSize/2,z-blockSize/2,1,
            textureSize*5,texYP,
            x, y, z,
            id,
            
            x-blockSize/2,y+blockSize/2,z-blockSize/2,1,
            textureSize*5,texYN,
            x, y, z,
            id,
            
            x+blockSize/2,y-blockSize/2,z-blockSize/2,1,
            textureSize*4,texYP,
            x, y, z,
            id,
        ],
        
        // Left
        left: [
            x-blockSize/2,y+blockSize/2,z-blockSize/2,1,
            textureSize*5,texYN,
            x, y, z,
            id,
            
            x-blockSize/2,y-blockSize/2,z+blockSize/2,1,
            textureSize*6,texYP,
            x, y, z,
            id,
            
            x-blockSize/2,y+blockSize/2,z+blockSize/2,1,
            textureSize*6,texYN,
            x, y, z,
            id,
            
            x-blockSize/2,y-blockSize/2,z-blockSize/2,1,
            textureSize*5,texYP,
            x, y, z,
            id,
            
            x-blockSize/2,y-blockSize/2,z+blockSize/2,1,
            textureSize*6,texYP,
            x, y, z,
            id,
            
            x-blockSize/2,y+blockSize/2,z-blockSize/2,1,
            textureSize*5,texYN,
            x, y, z,
            id,
        ]
    }
}

export function replaceBlock(chunks, visableBlocks, vArrays, block, id) {
    let chunk = getBlockChunk(block)
    let chunkName = getChunkNameFromPos(...chunk)
    let vBlockI = visableBlocks[chunkName].findIndex(a => vec3.dis(a, block) < 0.1)
    if (chunks[chunkName][getChunkBlockIndex(block, chunk)] == id) return

    chunks[chunkName][getChunkBlockIndex(block, chunk)] = id

    let dirsIds = [
        [vec3.add(block, [ 1, 0, 0]), 1, 5],
        [vec3.add(block, [-1, 0, 0]), 0, 3],
        [vec3.add(block, [ 0, 1, 0]), 3, 1],
        [vec3.add(block, [ 0,-1, 0]), 2, 0],
        [vec3.add(block, [ 0, 0, 1]), 5, 4],
        [vec3.add(block, [ 0, 0,-1]), 4, 2],
    ].map(([eBlock, p, k]) => {
        let eChunk = getBlockChunk(eBlock)
        let eChunkName = getChunkNameFromPos(...eChunk)
        let evBlockI = visableBlocks[eChunkName].findIndex(a => vec3.dis(a, eBlock) < 0.1)
        let eBlockId = chunks[eChunkName] != undefined ? chunks[eChunkName][getChunkBlockIndex(eBlock, eChunk)] : 0
        if (eBlockId == 0) return 0
        let eBlockVerts = createBlockVertices(eBlock, eBlockId, 16)

        vArrays[eChunkName] = vArrays[eChunkName] == undefined ? [] : Array.from(vArrays[eChunkName])
        
        if (visableBlocks[eChunkName][evBlockI] == undefined && eBlockId != 0) {
            evBlockI = visableBlocks[eChunkName].push([...eBlock, [
                vec3.add(eBlock, [ 1, 0, 0]),
                vec3.add(eBlock, [-1, 0, 0]),
                vec3.add(eBlock, [ 0, 1, 0]),
                vec3.add(eBlock, [ 0,-1, 0]),
                vec3.add(eBlock, [ 0, 0, 1]),
                vec3.add(eBlock, [ 0, 0,-1]),
            ].map(fBlock => {
                let fChunk = getBlockChunk(fBlock)
                let fChunkName = getChunkNameFromPos(...fChunk)
                chunks[fChunkName] != undefined ? chunks[fChunkName][getChunkBlockIndex(fBlock, fChunk)] : 0
            }), vArrays[eChunkName.length]]) - 1
        } else {
            
            let numVertsToRemove = visableBlocks[eChunkName][evBlockI].slice(3, 9).reduce((a, b) => a += (b == 0), 0) * 6
            for (let i=0; i<numVertsToRemove; i++) {
                vArrays[eChunkName][visableBlocks[eChunkName][evBlockI][9]+10*i+9] = -1
            }
        }

        visableBlocks[eChunkName][evBlockI][9] = vArrays[eChunkName].length
        visableBlocks[eChunkName][evBlockI][3+p] = id
        
        if (visableBlocks[eChunkName][evBlockI][5] == 0) vArrays[eChunkName].push(...eBlockVerts.top)
        if (visableBlocks[eChunkName][evBlockI][6] == 0) vArrays[eChunkName].push(...eBlockVerts.bottom)
        if (visableBlocks[eChunkName][evBlockI][4] == 0) vArrays[eChunkName].push(...eBlockVerts.left)
        if (visableBlocks[eChunkName][evBlockI][3] == 0) vArrays[eChunkName].push(...eBlockVerts.right)
        if (visableBlocks[eChunkName][evBlockI][7] == 0) vArrays[eChunkName].push(...eBlockVerts.front)
        if (visableBlocks[eChunkName][evBlockI][8] == 0) vArrays[eChunkName].push(...eBlockVerts.back)

        vArrays[eChunkName] = new Float32Array(vArrays[eChunkName])

        return eBlockId
    })

    vArrays[chunkName] = vArrays[chunkName] == undefined ? [] : Array.from(vArrays[chunkName])
    if (id == 0) {
        let numVertsToRemove = visableBlocks[chunkName][vBlockI].slice(3, 9).reduce((a, b) => a += (b == 0), 0) * 6
        for (let i=0; i<numVertsToRemove; i++) {
            vArrays[chunkName][visableBlocks[chunkName][vBlockI][9]+10*i+9] = -1
        }
        visableBlocks[chunkName].splice(vBlockI, 1)
    } else {
        if (vBlockI == -1) {
            visableBlocks[chunkName].push([...block, ...dirsIds, vArrays[chunkName] == undefined ? 0 : vArrays[chunkName].length])
            let blockVerts = createBlockVertices(block, id, 16)
            let newVerts = []

            if (dirsIds[2] == 0) newVerts.push(...blockVerts.top)
            if (dirsIds[3] == 0) newVerts.push(...blockVerts.bottom)
            if (dirsIds[1] == 0) newVerts.push(...blockVerts.left)
            if (dirsIds[0] == 0) newVerts.push(...blockVerts.right)
            if (dirsIds[4] == 0) newVerts.push(...blockVerts.front)
            if (dirsIds[5] == 0) newVerts.push(...blockVerts.back)

            vArrays[chunkName].push(...newVerts)
        }
    }
    vArrays[chunkName] = new Float32Array(vArrays[chunkName])
}
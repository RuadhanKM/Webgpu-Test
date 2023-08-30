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

onmessage = () => {
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
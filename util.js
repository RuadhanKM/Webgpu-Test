import { chunkSize, renderDistance } from "./settings.js"

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
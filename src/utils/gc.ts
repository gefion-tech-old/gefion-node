export function getUsedArrayBuffers(): number {
    (global as any).gc()
    return process.memoryUsage().arrayBuffers
}
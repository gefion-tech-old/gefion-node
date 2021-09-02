/**
 * Измерить занятую буферами память с принудительным запуском
 * сборщика мусора перед измерением при условии, что нода запущена
 * с --expose-gc флагом
 */
export function getUsedArrayBuffers(): number {
    (global as any).gc()
    return process.memoryUsage().arrayBuffers
}
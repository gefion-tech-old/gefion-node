export const ATOMIC_SYMBOL = {
    AtomicService: Symbol.for('AtomicService'),
    AtomicEntity: Symbol.for('AtomicEntity'),
    AtomicRepository: Symbol.for('AtomicRepository'),
    AtomicConfig: Symbol.for('AtomicConfig'),
    LockCollectorService: Symbol.for('LockCollectorService')
}

export type AtomicConfig = {
    /**
     * Количество миллисекунд прошедших с момента установки блокировки,
     * чтобы блокировка считалась недействительной
     */
    lockExpires: number
}
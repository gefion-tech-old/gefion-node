export const ATOMIC_SYMBOL = {
    AtomicService: Symbol('AtomicService'),
    AtomicEntity: Symbol('AtomicEntity'),
    AtomicRepository: Symbol('AtomicRepository'),
    AtomicConfig: Symbol('AtomicConfig'),
    LockCollectorService: Symbol('LockCollectorService')
}

export type AtomicConfig = {
    /**
     * Количество миллисекунд прошедших с момента установки блокировки,
     * чтобы блокировка считалась недействительной
     */
    lockExpires: number
}
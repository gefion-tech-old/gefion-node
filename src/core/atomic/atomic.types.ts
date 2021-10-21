export const ATOMIC_SYMBOL = {
    AtomicService: Symbol('AtomicService'),
    AtomicEntity: Symbol('AtomicEntity'),
    AtomicConfig: Symbol('AtomicConfig'),
    LockCollectorService: Symbol('LockCollectorService'),
    LockCollectorRepair: Symbol('LockCollectorRepair')
}

export type AtomicConfig = {
    /**
     * Количество миллисекунд прошедших с момента установки блокировки,
     * чтобы блокировка считалась недействительной
     */
    readonly lockExpires: number
}
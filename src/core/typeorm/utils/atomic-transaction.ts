import * as localAtomic from '../../../utils/local-atomic'

/**
 * Название атомарной операции транзакции
 */
const atomicOperation = 'Transaction'

/**
 * Получить блокировку транзакции
 */
export function lock(): Promise<void> {
    return localAtomic.lock(atomicOperation)
}

/**
 * Убрать блокировку транзакции
 */
export function unlock(): void {
    return localAtomic.unlock(atomicOperation)
}
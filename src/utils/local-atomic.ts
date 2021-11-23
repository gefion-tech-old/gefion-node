export type Locking = {
    promise: Promise<void>
    resolve: () => void
}

/**
 * Список блокировок операций
 */
const lockingOperations = new Map<string, Locking>()

/**
 * Заблокировать конкретную операцию для обеспечения атомарности на уровне
 * ноды, а не на уровне приложения, как модуль атомарности ядра
 */
export async function lock(operation: string): Promise<void> {
    /**
     * Получить новую блокировку
     */
    const newLocking = ((): Locking => {
        let resolve: any

        const locking = {
            promise: new Promise<void>(res => {
                resolve = res
            }),
            resolve
        }

        return locking
    })()

    /**
     * Ожидать завершение текущей блокировки операции, если такая есть,
     * а после попытаться установить новую блокировку. Повторять попытки 
     * пока не получится установить блокировку
     */
    while (true) {
        const currentLocking = lockingOperations.get(operation)

        if (!currentLocking) {
            lockingOperations.set(operation, newLocking)
            break
        }

        await currentLocking.promise
    }
}

/**
 * Разблокировать конкретную операцию
 */
export function unlock(operation: string): void {
    const currentLocking = lockingOperations.get(operation)
    lockingOperations.delete(operation)

    if (currentLocking) {
        currentLocking.resolve()
    }
}
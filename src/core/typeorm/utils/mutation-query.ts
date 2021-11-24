import * as atomicTransaction from './atomic-transaction'

/**
 * Обёртка для мутационных запросов в базу данных. Обёртывает запрос локальной атомарной
 * блокировкой транзакции, если запрос не является частью транзакции. Причина: особенности
 * работы с sqlite + typeorm, которые не умеют адекватно и без побочных эффектов работать
 * с транзакциями.
 * 
 * В один момент времени может выполняться только один запрос в базу данных на запись,
 * но это не имеет особого значения, так как под капотом запросы все равно являются синхронными.
 * Единственное, было бы неприятно, если цикл событий будет блокировать какой-то зависимый
 * от процессора синхронный код
 */
export async function mutationQuery<T>(nestedTransaction: boolean, callback: () => Promise<T>): Promise<T> {
    let result: T

    try {
        if (!nestedTransaction) {
            await atomicTransaction.lock()
        }
    
        result = await callback()
    } finally {
        if (!nestedTransaction) {
            atomicTransaction.unlock()
        }
    }

    return result
}
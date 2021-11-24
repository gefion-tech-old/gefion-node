import { Connection } from 'typeorm'
import * as atomicTransaction from './atomic-transaction'
import uniqid from 'uniqid'

export class NestedTransactionIsNotActive extends Error {

    public name = 'NestedTransactionIsNotActive'
    public message = 'Вложенная транзакция должна исполнятся в рамках запущенной транзакции'

}

/**
 * Атомарно начать транзакцию. Если транзакция вложенная, то обернуть запросы в savepoint - rollback для
 * симуляции вложенных транзакций
 */
export async function transaction<T = void>(nestedTransaction: boolean, connection: Connection, handler: () => Promise<T>): Promise<T> {
    const queryRunner = connection.createQueryRunner()
    let result: T
    
    await queryRunner.connect()

    try {
        if (!nestedTransaction) {
            await atomicTransaction.lock()
            try {
                result = await queryRunner.manager.transaction<T>(handler)
            } finally {
                atomicTransaction.unlock()
            }
        } else {
            const savepoint = uniqid()

            if (!queryRunner.isTransactionActive) {
                throw new NestedTransactionIsNotActive
            }

            await queryRunner.manager.query(`SAVEPOINT "${savepoint}"`)
            try {
                result = await handler()
            } catch (error) {
                await queryRunner.manager.query(`ROLLBACK TO SAVEPOINT "${savepoint}"`)
                throw error
            }
        }
    } finally {
        await queryRunner.release()
    }

    return result
}
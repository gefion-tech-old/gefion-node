import { Connection } from 'typeorm'
import * as atomicTransaction from './atomic-transaction'

export class NestedTransactionIsNotActive extends Error {

    public name = 'NestedTransactionIsNotActive'
    public message = 'Вложенная транзакция должна исполнятся в рамках запущенной транзакции'

}

/**
 * Атомарно начать транзакцию. Если транзакция вложенная, то ничего не делать, все запросы и так
 * будут в рамках транзакции 
 */
export async function transaction<T = void>(nestedTransaction: boolean, connection: Connection, handler: () => Promise<T>): Promise<T> {
    const queryRunner = connection.createQueryRunner()
    let result: T
    
    await queryRunner.connect()

    try {
        if (!nestedTransaction) {
            await atomicTransaction.lock()
            result = await queryRunner.manager.transaction<T>(handler)
            atomicTransaction.unlock()
        } else {
            if (!queryRunner.isTransactionActive) {
                throw new NestedTransactionIsNotActive
            }
            result = await handler()
        }
    } finally {
        await queryRunner.release()
    }

    return result
}
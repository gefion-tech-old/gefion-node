import { EntityManager } from 'typeorm'
import { 
    EntityManagerWithoutTransaction,
    InvalidTransactionObject
} from '../typeorm.errors'

/**
 * Проверить переданный объект на предмет того, что он является активной транзакцией, а
 * после вернуть его. В противном случае, выбросить исключение.
 */
export function activeTransaction(transactionEntityManager: EntityManager): EntityManager {
    if (transactionEntityManager instanceof EntityManager) {
        if (transactionEntityManager.queryRunner?.isTransactionActive === true) {
            return transactionEntityManager
        } else {
            throw new EntityManagerWithoutTransaction
        }
    } else {
        throw new InvalidTransactionObject
    }
}
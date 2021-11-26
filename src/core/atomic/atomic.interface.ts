import { Options } from 'async-retry'

export interface IAtomicService {

    /**
     * Заблокировать конкретную операцию. Повторение по умолчанию настроено
     * в соответствии с дефолтными настройками async-retry
     */
    lock(operation: string, options?: Options): Promise<boolean>

    /**
     * Разблокировать конкретную операцию
     */
    unlock(operation: string): Promise<void>

    /**
     * Проверить блокировку операции. Повторение по умолчанию настроено
     * в соответствии с дефолтными настройками async-retry. Если возвращается
     * true, то операция заблокирована
     */
    check(operation: string, options?: Options): Promise<boolean>

}
import { SnapshotMetadata } from '../../metadata/metadata.types'
import { CreateMiddleware, MiddlewareMetadata } from './middleware.types'

export interface IMiddlewareService {

    /**
     * Создать промежуточное ПО, если его ещё не существует
     */
    createIfNotExists(options: CreateMiddleware, nestedTransaction?: boolean): Promise<void>

    /**
     * Проверить существование указанного промежуточного ПО
     */
    isExists(name: string): Promise<boolean>

    /**
     * Изменить метаданные указанного промежуточного ПО
     */
    setMetadata(name: string, snapshotMetadata: SnapshotMetadata<MiddlewareMetadata>, nestedTransaction?: boolean): Promise<void>

    /**
     * Удалить указанное промежуточное ПО. Попытаться удалить метод контроллера, если получится
     */
    remove(name: string, nestedTransaction?: boolean): Promise<void>

    /**
     * Включить флаг csrf в указанном промежуточном ПО
     */
    enableCsrf(name: string, nestedTransaction?: boolean): Promise<void>

    /**
     * Выключить флаг csrf в указанном промежуточном ПО
     */
    disableCsrf(name: string, nestedTransaction?: boolean): Promise<void>

}
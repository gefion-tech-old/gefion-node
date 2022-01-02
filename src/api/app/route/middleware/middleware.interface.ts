import { SnapshotMetadata } from '../../metadata/metadata.types'
import { CreateMiddleware, MiddlewareMetadata, Middleware } from './middleware.types'

export interface IMiddlewareService {

    /**
     * Создать промежуточное ПО, если его ещё не существует
     */
    createIfNotExists(options: CreateMiddleware, nestedTransaction?: boolean): Promise<void>

    /**
     * Проверить существование указанного промежуточного ПО
     */
    isExists(middleware: Middleware): Promise<boolean>

    /**
     * Изменить метаданные указанного промежуточного ПО
     */
    setMetadata(middleware: Middleware, snapshotMetadata: SnapshotMetadata<MiddlewareMetadata>, nestedTransaction?: boolean): Promise<void>

    /**
     * Удалить указанное промежуточное ПО. Попытаться удалить метод контроллера, если получится
     */
    remove(middleware: Middleware, nestedTransaction?: boolean): Promise<void>

    /**
     * Включить флаг csrf в указанном промежуточном ПО
     */
    enableCsrf(middleware: Middleware, nestedTransaction?: boolean): Promise<void>

    /**
     * Выключить флаг csrf в указанном промежуточном ПО
     */
    disableCsrf(middleware: Middleware, nestedTransaction?: boolean): Promise<void>

}
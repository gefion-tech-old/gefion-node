import { CreateMiddlewareGroup, MiddlewareGroupMetadata } from './middleware-group.types'
import { SnapshotMetadata } from '../../metadata/metadata.types'

export interface IMiddlewareGroupService {

    /**
     * Создать группу промежуточного ПО, если её ещё не существует
     */
    createIfNotExists(options: CreateMiddlewareGroup, nestedTransaction?: boolean): Promise<void>

    /**
     * Проверить существование группы ПО с указанным названием
     */
    isExists(name: string): Promise<boolean>

    /**
     * Изменить метаданные указанной группы промежуточного ПО
     */
    setMetadata(name: string, snapshotMetadata: SnapshotMetadata<MiddlewareGroupMetadata>, nestedTransaction?: boolean): Promise<void>

    /**
     * Добавить указанное промежуточное ПО в указанную группу, если оно ещё в ней не состоит
     */
    addMiddleware(groupName: string, middlewareName: string, nestedTransaction?: boolean): Promise<void>

    /**
     * Удалить указанное промежуточное ПО из указанной группы
     */
    removeMiddleware(groupName: string, middlewareName: string, nestedTransaction?: boolean): Promise<void>

    /**
     * Удалить указанную группу промежуточного ПО
     */
    remove(name: string, nestedTransaction?: boolean): Promise<void>

    /**
     * Включить флаг csrf в указанной группе промежуточного ПО
     */
    enableCsrf(name: string, nestedTransaction?: boolean): Promise<void>

    /**
     * Выключить флаг csrf в указанной группе промежуточного ПО
     */
    disableCsrf(name: string, nestedTransaction?: boolean): Promise<void>

}
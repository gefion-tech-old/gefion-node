import { SnapshotMetadata } from '../../metadata/metadata.types'
import { PermissionMetadata } from './permission.types'

export interface IPermissionService {

    /**
     * Создать новое полномочие
     */
    create(permission: string, nestedTransaction?: boolean): Promise<void>

    /**
     * Удалить указанное полномочие
     */
    remove(permission: string, nestedTransaction?: boolean): Promise<void>

    /**
     * Проверить существование полномочия
     */
    isExists(permission: string): Promise<boolean>

    /**
     * Получить метаданные полномочия, если оно существует
     */
    getMetadata(permission: string): Promise<SnapshotMetadata<PermissionMetadata> | undefined>

    /**
     * Установить метаданные в полномочие, если оно существует
     */
    setMetadata(permission: string, snapshotMetadata: SnapshotMetadata<PermissionMetadata>, nestedTransaction?: boolean): Promise<void>

}
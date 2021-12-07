import { SnapshotMetadata } from '../../metadata/metadata.types'
import { RoleMetadata, RolePermissionMetadata } from './role.types'

export interface IRoleService {

    /**
     * Создать новую роль
     */
    create(role: string, nestedTransaction?: boolean): Promise<void>

    /**
     * Удалить указанную роль
     */
    remove(role: string, nestedTransaction?: boolean): Promise<void>

    /**
     * Проверить существование роли
     */
    isExists(role: string): Promise<boolean>

    /**
     * Добавить к роли указанные полномочия
     */
    addPermission(role: string, permission: string, nestedTransaction?: boolean): Promise<void>

    /**
     * Удалить из роли указанные полномочия
     */
    removePermission(role: string, permission: string, nestedTransaction?: boolean): Promise<void>

    /**
     * Проверить наличие полномочия в роли
     */
    isExistsPermission(role: string, permission: string): Promise<boolean>

    /**
     * Получить метаданные из связи указанной роли с указанным полномочием, если она
     * существует
     */
    getRolePermissionMetadata(role: string, permission: string): Promise<SnapshotMetadata<RolePermissionMetadata> | undefined>

    /**
     * Изменить метаданные в связи указанной роли с указанным полномочием, если она
     * существует
     */
    setRolePermissionMetadata(
        role: string, 
        permission: string, 
        snapshotMetadata: SnapshotMetadata<RolePermissionMetadata>, 
        nestedTransaction?: boolean
    ): Promise<void>

    /**
     * Получить метаданные роли, если она существует
     */
    getMetadata(role: string): Promise<SnapshotMetadata<RoleMetadata> | undefined>

    /**
     * Установить метаданные в роль, если она существует
     */
    setMetadata(role: string, snapshotMetadata: SnapshotMetadata<RoleMetadata>, nestedTransaction?: boolean): Promise<void>

}
import { BindableCreator } from '../../creator/creator.types'

export interface RoleMetadata {
    /**
     * Метаданные, которые можно изменить в любой момент времени без особых ограничений
     */
    custom: any
}

export interface RolePermissionMetadata {
    /**
     * Метаданные, которые можно изменить в любой момент времени без особых ограничений
     */
    custom: any
}

export interface CreateRole {
    /**
     * Название роли
     */
    name: string
    /**
     * Создатель роли
     */
    creator: BindableCreator
}

/**
 * Идентификатор события мутации
 */
export const RoleEventMutationName = Symbol('RoleMutationEvent')

export enum RoleEventMutation {
    /**
     * Событие создания роли
     */
    Create = 'Create',
    /**
     * Событие удаления роли
     */
    Remove = 'Remove',
    /**
     * Событие добавления к роли полномочия
     */
    AddPermission = 'AddPermission',
    /**
     * Событие удаления у роли полномочия
     */
    RemovePermission = 'RemovePermission',
    /**
     * Событие установки метаданных в связи полномочия с ролью
     */
    SetRolePermissionMetadata = 'SetRolePermissionMetadata',
    /**
     * Событие установки метаданных в роль
     */
    SetMetadata = 'SetMetadata'
}

export interface PermissionEventContext {
    type: RoleEventMutation.AddPermission | RoleEventMutation.RemovePermission | RoleEventMutation.SetRolePermissionMetadata
    roleName: string
    permissionName: string
}

export interface RoleEventContext {
    type: RoleEventMutation,
    roleName: string
}

export type EventContext = RoleEventContext | PermissionEventContext
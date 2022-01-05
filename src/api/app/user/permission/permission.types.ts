import { BindableCreator } from '../../creator/creator.types'

export interface PermissionMetadata {
    /**
     * Метаданные, которые можно изменить в любой момент времени без особых ограничений
     */
    custom: any
}

export interface CreatePermission {
    /**
     * Название полномочия
     */
    name: string
    /**
     * Создатель полномочия
     */
    creator: BindableCreator
}

/**
 * Идентификатор события мутации
 */
export const PermissionEventMutationName = Symbol('PermissionMutationEvent')

export enum PermissionEventMutation {
    /**
     * Событие создания полномочия
     */
    Create = 'Create',
    /**
     * Событие изменения метаданных полномочия
     */
    SetMetadata = 'SetMetadata',
    /**
     * Событие удаления полномочия
     */
    Remove = 'Remove'
}

export interface EventContext {
    type: PermissionEventMutation,
    permissionName: string
}
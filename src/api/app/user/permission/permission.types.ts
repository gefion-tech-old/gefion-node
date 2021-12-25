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
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
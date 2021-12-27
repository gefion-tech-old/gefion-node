import { BindableCreator } from '../../creator/creator.types'

export interface MiddlewareGroupMetadata {
    /**
     * Метаданные, которые можно изменить в любой момент времени без особых ограничений
     */
    custom: any
}

export interface CreateMiddlewareGroup {
    /**
     * Название группы промежуточного ПО
     */
    readonly name: string
    /**
     * Создатель
     */
    readonly creator: BindableCreator
    /**
     * Флаг указывающий на то, что это группа по умолчанию
     */
    readonly isDefault: boolean
}
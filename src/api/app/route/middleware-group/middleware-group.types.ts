import { BindableCreator } from '../../creator/creator.types'

export interface MiddlewareGroup {
    /**
     * Пространство имён
     */
    readonly namespace: string
    /**
     * Название
     */
    readonly name: string
}

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
     * Пространство имён группы промежуточного ПО
     */
    readonly namespace: string
    /**
     * Создатель
     */
    readonly creator: BindableCreator
    /**
     * Флаг указывающий на то, что это группа по умолчанию
     */
    readonly isDefault: boolean
}
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

/**
 * Идентификатор события мутации
 */
export const MiddlewareGroupEventMutationName = Symbol('MiddlewareGroupMutationEvent')

export enum MiddlewareGroupEventMutation {
    /**
     * Событие создания группы
     */
    Create = 'Create',
    /**
     * Событие изменения метаданных группы
     */
    SetMetadata = 'SetMetadata',
    /**
     * Событие добавления middleware в группу
     */
    AddMiddleware = 'AddMiddleware',
    /**
     * Событие удаления middleware из группы
     */
    RemoveMiddleware = 'RemoveMiddleware',
    /**
     * Событиe изменения порядкового номера middleware в группе
     */
    SetMiddlewareSerialNumber = 'SetMiddlewareSerialNumber',
    /**
     * Событие удаления группы
     */
    Remove = 'Remove',
    /**
     * Событие включения флага csrf в группе
     */
    EnableCsrf = 'EnableCsrf',
    /**
     * Событие выключения флага csrf в группе
     */
    DisableCsrf = 'DisableCsrf'
}

export interface MiddlewareEventContext {
    type: MiddlewareGroupEventMutation.AddMiddleware | MiddlewareGroupEventMutation.RemoveMiddleware | MiddlewareGroupEventMutation.SetMiddlewareSerialNumber
    middlewareGroupId: number
    middlewareId: number
}

export interface MiddlewareGroupEventContext {
    type: Exclude<MiddlewareGroupEventMutation, MiddlewareEventContext['type']>,
    middlewareGroupId: number
}

export type EventContext = MiddlewareGroupEventContext | MiddlewareEventContext
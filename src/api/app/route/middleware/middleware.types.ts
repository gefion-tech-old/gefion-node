import { BindableCreator } from '../../creator/creator.types'
import { Method } from '../../method/method.types'

export interface Middleware {
    /**
     * Пространство имён
     */
    readonly namespace: string
    /**
     * Название
     */
    readonly name: string
}

export interface MiddlewareMetadata {
    /**
     * Метаданные, которые можно изменить в любой момент времени без особых ограничений
     */
    custom: any
}

export interface CreateMiddleware {
    /**
     * Название промежуточного ПО
     */
    readonly name: string
    /**
     * Пространство имён промежуточного ПО
     */
    readonly namespace: string
    /**
     * Метод промежуточного ПО
     */
    readonly method: Method
    /**
     * Создатель
     */
    readonly creator: BindableCreator
}

/**
 * Идентификатор события мутации
 */
export const MiddlewareEventMutationName = Symbol('MiddlewareMutationEvent')

export enum MiddlewareEventMutation {
    /**
     * Событие создания middleware
     */
    Create = 'Create',
    /**
     * Событие изменения метаданных middleware
     */
    SetMetadata = 'SetMetadata',
    /**
     * Событие удаления middleware
     */
    Remove = 'Remove',
    /**
     * Событие включения csrf флага в middleware
     */
    EnableCsrf = 'EnableCsrf',
    /**
     * Событие выключения csrf флага в middleware
     */
    DisableCsrf = 'DisableCsrf'
}

export interface EventContext {
    type: MiddlewareEventMutation
    middlewareId: number
}
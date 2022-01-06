import { BindableCreator } from '../../creator/creator.types'
import { Method } from '../../method/method.types'

export interface Guard {
    /**
     * Пространство имён
     */
    namespace: string
    /**
     * Название
     */
    name: string
}

export interface GuardMetadata {
    /**
     * Метаданные, которые можно изменить в любой момент времени без особых ограничений
     */
    custom: any
}

export interface CreateGuard {
    /**
     * Название
     */
    name: string
    /**
     * Пространство имён
     */
    namespace: string
    /**
     * Создатель
     */
    creator: BindableCreator
    /**
     * Метод
     */
    method: Method
}

/**
 * Идентификатор события мутации
 */
export const GuardEventMutationName = Symbol('GuardMutationEvent')

export enum GuardEventMutation {
    /**
     * Событие создания ресурса охранника
     */
    Create = 'Create',
    /**
     * Событие установки метаданных в ресурс охранника
     */
    SetMetadata = 'SetMetadata',
    /**
     * Событие удаления ресурса охранника
     */
    Remove = 'Remove'
}

export interface EventContext {
    type: GuardEventMutation
    guardId: number
}
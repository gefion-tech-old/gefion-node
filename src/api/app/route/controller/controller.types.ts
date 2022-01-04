import { Method } from '../../method/method.types'
import { BindableCreator } from '../../creator/creator.types'

export interface Controller {
    /**
     * Пространство имён
     */
    readonly namespace: string
    /**
     * Название
     */
    readonly name: string
}

export interface ControllerMetadata {
    /**
     * Метаданные, которые можно изменить в любой момент времени без особых ограничений
     */
    custom: any
}

export interface CreateController {
    /**
     * Название контроллера
     */
    readonly name: string
    /**
     * Пространство имён контроллера
     */
    readonly namespace: string
    /**
     * Метод контроллера
     */
    readonly method: Method
    /**
     * Создатель контроллера
     */
    readonly creator: BindableCreator
}

/**
 * Идентификатор события мутации
 */
export const ControllerEventMutationName = Symbol('ControllerMutationEvent')

export enum ControllerEventMutation {
    /**
     * Событие создания контроллера
     */
    Create = 'Create',
    /**
     * Событие изменения метаданных контроллера
     */
    SetMetadata = 'SetMetadata',
    /**
     * Событие удаления контроллера
     */
    Remove = 'Remove'
}

export interface EventContext {
    type: ControllerEventMutation
    controllerId: number
}
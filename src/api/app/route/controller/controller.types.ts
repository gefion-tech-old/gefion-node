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
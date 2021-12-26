import { Method } from '../../method/method.types'
import { BindableCreator } from '../../creator/creator.types'

export interface ControllerMetadata {
    /**
     * Метаданные, которые можно изменить в любой момент времени без особых ограничений
     */
    custom: any
}

export interface CreateController {
    /**
     * Уникальное название контроллера
     */
    readonly name: string
    /**
     * Метод контроллера
     */
    readonly method: Method
    /**
     * Создатель контроллера
     */
    readonly creator: BindableCreator
}
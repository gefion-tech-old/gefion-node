import { BindableCreator } from '../../creator/creator.types'
import { Method } from '../../method/method.types'

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
     * Метод промежуточного ПО
     */
    readonly method: Method
    /**
     * Создатель
     */
    readonly creator: BindableCreator
}
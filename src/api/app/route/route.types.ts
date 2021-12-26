import { BindableCreator } from '../creator/creator.types'

export const ROUTE_SYMBOL = {
    ControllerEntity: Symbol('ControllerEntity'),
    ControllerService: Symbol('ControllerService'),
    MiddlewareEntity: Symbol('MiddlewareEntity'),
    MiddlewareService: Symbol('MiddlewareService')
}

export interface RouteMetadata {
    /**
     * Метаданные, которые можно изменить в любой момент времени без особых ограничений
     */
    custom: any
}

export type HttpMethod = 'GET' | 'POST' | 'HEAD' | 'OPTIONS' | 'DELETE' | 'PUT' | 'PATCH'

export interface CreateRoute {
    /**
     * Название маршрута
     */
    readonly name: string
    /**
     * Метод маршрута
     */
    readonly method: HttpMethod
    /**
     * Путь
     */
    readonly path: string
    /**
     * Создатель
     */
    readonly creator: BindableCreator
}
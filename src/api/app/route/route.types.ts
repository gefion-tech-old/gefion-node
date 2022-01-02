import { BindableCreator } from '../creator/creator.types'

export const ROUTE_SYMBOL = {
    ControllerEntity: Symbol('ControllerEntity'),
    ControllerService: Symbol('ControllerService'),
    MiddlewareEntity: Symbol('MiddlewareEntity'),
    MiddlewareService: Symbol('MiddlewareService'),
    MiddlewareGroupEntity: Symbol('MiddlewareGroupEntity'),
    MiddlewareGroupMiddlewareEntity: Symbol('MiddlewareGroupMiddlewareEntity'),
    MiddlewareGroupService: Symbol('MiddlewareGroupService'),
    RouteEntity: Symbol('RouteEntity'),
    RouteMiddlewareEntity: Symbol('RouteMiddlewareEntity'),
    RouteMiddlewareGroupEntity: Symbol('RouteMiddlewareGroupEntity'),
    RouteService: Symbol('RouteService')
}

export interface Route {
    /**
     * Пространство имён
     */
    readonly namespace: string
    /**
     * Название
     */
    readonly name: string
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
     * Пространство имён маршрута
     */
    readonly namespace: string
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
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

/**
 * Идентификатор события мутации
 */
export const RouteEventMutationName = Symbol('RouteMutationEvent')

export enum RouteEventMutation {
    /**
     * Событие создания маршрута
     */
    Create = 'Create',
    /**
     * Событие изменения метаданных маршрута
     */
    SetMetadata = 'SetMetadata',
    /**
     * Событие добавления группы промежуточного ПО в маршрут
     */
    AddMiddlewareGroup = 'AddMiddlewareGroup',
    /**
     * Событие удаление группы промежуточного ПО из маршрута
     */
    RemoveMiddlewareGroup = 'RemoveMiddlewareGroup',
    /**
     * Событие изменения порядкового номера группы промежуточного ПО в маршруте
     */
    SetMiddlewareGroupSerialNumber = 'SetMiddlewareGroupSerialNumber',
    /**
     * Событие добавления промежуточного ПО в маршрут
     */
    AddMiddleware = 'AddMiddleware',
    /**
     * Событие удаления промежуточного ПО из маршрута
     */
    RemoveMiddleware = 'RemoveMiddleware',
    /**
     * Событие изменения порядкового номера промежуточного ПО в маршруте
     */
    SetMiddlewareSerialNumber = 'SetMiddlewareSerialNumber',
    /**
     * Событие включения csrf флага в маршруте
     */
    EnableCsrf = 'EnableCsrf',
    /**
     * Событие выключения csrf флага в маршруте
     */
    DisableCsrf = 'DisableCsrf',
    /**
     * Событие удаления маршрута
     */
    Remove = 'Remove',
    /**
     * Событие привязки контроллера к маршруту
     */
    BindController = 'BindController',
    /**
     * Событие отвязки контроллера от маршрута
     */
    UnbindController = 'UnbindController'
}

export interface MiddlewareGroupEventContext {
    type: RouteEventMutation.AddMiddlewareGroup | RouteEventMutation.RemoveMiddlewareGroup | RouteEventMutation.SetMiddlewareGroupSerialNumber
    routeId: number
    middlewareGroupId: number
}

export interface MiddlewareEventContext {
    type: RouteEventMutation.AddMiddleware | RouteEventMutation.RemoveMiddleware | RouteEventMutation.SetMiddlewareSerialNumber
    routeId: number
    middlewareId: number
}

export interface ControllerEventContext {
    type: RouteEventMutation.BindController
    routeId: number
    controllerId: number
}

export interface RouteEventContext {
    type: RouteEventMutation
    routeId: number
}

export type EventContext = RouteEventContext | ControllerEventContext | MiddlewareEventContext | MiddlewareGroupEventContext
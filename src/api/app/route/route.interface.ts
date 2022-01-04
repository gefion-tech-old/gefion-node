import { CreateRoute, RouteMetadata, Route } from './route.types'
import { SnapshotMetadata } from '../metadata/metadata.types'
import { Middleware } from './middleware/middleware.types'
import { MiddlewareGroup } from './middleware-group/middleware-group.types'
import { Controller } from './controller/controller.types'

export interface IRouteService {

    /**
     * Создать маршрут, если его ещё не существует
     */
    create(options: CreateRoute, nestedTransaction?: boolean): Promise<void>

    /**
     * Проверить существование указанного маршрута
     */
    isExists(route: Route): Promise<boolean>

    /**
     * Изменить метаданные маршрута
     */
    setMetadata(route: Route, snapshotMetadata: SnapshotMetadata<RouteMetadata>, nestedTransaction?: boolean): Promise<void>

    /**
     * Добавить группу промежуточного ПО в указанный маршрут
     */
    addMiddlewareGroup(route: Route, group: MiddlewareGroup, nestedTransaction?: boolean): Promise<void>

    /**
     * Удалить указанную группу промежуточного ПО из указанного маршрута
     */
    removeMiddlewareGroup(route: Route, group: MiddlewareGroup, nestedTransaction?: boolean): Promise<void>

    /**
     * Изменить порядковый номер указанной группы промежуточного ПО в указанном маршрута
     */
    setMiddlewareGroupSerialNumber(route: Route, group: MiddlewareGroup, serialNumber: number, nestedTransaction?: boolean): Promise<void>

    /**
     * Добавить указанное промежуточное ПО напрямую к указанному маршрута
     */
    addMiddleware(route: Route, middleware: Middleware, nestedTransaction?: boolean): Promise<void>

    /**
     * Удалить указанное промежуточное ПО из указанного маршрута 
     */
    removeMiddleware(route: Route, middleware: Middleware, nestedTransaction?: boolean): Promise<void>

    /**
     * Изменить порядковый номер указанного промежуточного ПО в указанном маршрута
     */
    setMiddlewareSerialNumber(route: Route, middleware: Middleware, serialNumber: number, nestedTransaction?: boolean): Promise<void>

    /**
     * Включить флаг csrf в указанном маршруте
     */
    enableCsrf(route: Route, nestedTransaction?: boolean): Promise<void>

    /**
     * Выключить флаг csrf в указанном машруте
     */
    disableCsrf(route: Route, nestedTransaction?: boolean): Promise<void>

    /**
     * Удалить указанный маршрут
     */
    remove(route: Route, nestedTransaction?: boolean): Promise<void>

    /**
     * Привязать к указанному маршруту указанный контроллер
     */
    bindController(route: Route, controller: Controller, nestedTransaction?: boolean): Promise<void>

    /**
     * Отвязать у указанного маршрута его текущий контроллер
     */
    unbindController(route: Route, nestedTransaction?: boolean): Promise<void>

}
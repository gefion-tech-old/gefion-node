import { CreateRoute, RouteMetadata } from './route.types'
import { SnapshotMetadata } from '../metadata/metadata.types'

export interface IRouteService {

    /**
     * Создать маршрут, если его ещё не существует
     */
    createIfNotExists(options: CreateRoute, nestedTransaction?: boolean): Promise<void>

    /**
     * Проверить существование указанного маршрута
     */
    isExists(name: string): Promise<boolean>

    /**
     * Изменить метаданные маршрута
     */
    setMetadata(name: string, snapshotMetadata: SnapshotMetadata<RouteMetadata>, nestedTransaction?: boolean): Promise<void>

    /**
     * Добавить группу промежуточного ПО в указанный маршрут
     */
    addMiddlewareGroup(routeName: string, groupName: string, nestedTransaction?: boolean): Promise<void>

    /**
     * Удалить указанную группу промежуточного ПО из указанного маршрута
     */
    removeMiddlewareGroup(routeName: string, groupName: string, nestedTransaction?: boolean): Promise<void>

    /**
     * Изменить порядковый номер указанной группы промежуточного ПО в указанном маршрута
     */
    setMiddlewareGroupSerialNumber(routeName: string, groupName: string, serialNumber: number, nestedTransaction?: boolean): Promise<void>

    /**
     * Добавить указанное промежуточное ПО напрямую к указанному маршрута
     */
    addMiddleware(routeName: string, middlewareName: string, nestedTransaction?: boolean): Promise<void>

    /**
     * Удалить указанное промежуточное ПО из указанного маршрута 
     */
    removeMiddleware(routeName: string, middlewareName: string, nestedTransaction?: boolean): Promise<void>

    /**
     * Изменить порядковый номер указанного промежуточного ПО в указанном маршрута
     */
    setMiddlewareSerialNumber(routeName: string, middlewareName: string, serialNumber: number, nestedTransaction?: boolean): Promise<void>

    /**
     * Включить флаг csrf в указанном маршруте
     */
    enableCsrf(name: string, nestedTransaction?: boolean): Promise<void>

    /**
     * Выключить флаг csrf в указанном машруте
     */
    disableCsrf(name: string, nestedTransaction?: boolean): Promise<void>

    /**
     * Удалить указанный маршрут
     */
    remove(name: string, nestedTransaction?: boolean): Promise<void>

}
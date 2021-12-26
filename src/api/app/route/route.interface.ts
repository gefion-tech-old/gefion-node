import { CreateRoute, RouteMetadata } from './route.types'
import { SnapshotMetadata } from '../metadata/metadata.types'
import { Middleware } from '../entities/route.entity'

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
     * Получить список всех промежуточных ПО, в том числе и тех, которые в группах, в порядке их
     * предполагаемого вызова и без дублирования
     */
    getAllMiddlewares(routeName: string): Promise<Middleware[]>

    /**
     * Добавить группу промежуточного ПО в указанный маршрут
     */
    addMiddlewareGroup(routeName: string, groupName: string, nestedTransaction?: boolean): Promise<void>

    /**
     * Добавить указанное промежуточное ПО напрямую к указанному маршрута
     */
    addMiddleware(routeName: string, middlewareName: string, nestedTransaction?: boolean): Promise<void>

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
    remove(name: string): Promise<void>

}
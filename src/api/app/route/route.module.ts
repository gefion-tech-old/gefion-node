import { AsyncContainerModule, interfaces } from 'inversify'
import { 
    Controller, 
    Middleware, 
    MiddlewareGroup, 
    MiddlewareGroupMiddleware,
    Route,
    RouteMiddleware,
    RouteMiddlewareGroup
} from '../entities/route.entity'
import { ROUTE_SYMBOL } from './route.types'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'
import { IControllerService } from './controller/controller.interface'
import { ControllerService } from './controller/controller.service'
import { IMiddlewareService } from './middleware/middleware.interface'
import { MiddlewareService } from './middleware/middleware.service'
import { IMiddlewareGroupService } from './middleware-group/middleware-group.interface'
import { MiddlewareGroupService } from './middleware-group/middleware-group.service'
import { IRouteService } from './route.interface'
import { RouteService } from './route.service'

export const RouteModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<Function>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(Controller)
        .whenTargetNamed(ROUTE_SYMBOL.ControllerEntity)

    bind<Function>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(Middleware)
        .whenTargetNamed(ROUTE_SYMBOL.MiddlewareEntity)

    bind<Function>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(MiddlewareGroup)
        .whenTargetNamed(ROUTE_SYMBOL.MiddlewareGroupEntity)

    bind<Function>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(MiddlewareGroupMiddleware)
        .whenTargetNamed(ROUTE_SYMBOL.MiddlewareGroupMiddlewareEntity)

    bind<Function>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(Route)
        .whenTargetNamed(ROUTE_SYMBOL.RouteEntity)

    bind<Function>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(RouteMiddleware)
        .whenTargetNamed(ROUTE_SYMBOL.RouteMiddlewareEntity)

    bind<Function>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(RouteMiddlewareGroup)
        .whenTargetNamed(ROUTE_SYMBOL.RouteMiddlewareGroupEntity)

    bind<IControllerService>(ROUTE_SYMBOL.ControllerService)
        .to(ControllerService)

    bind<IMiddlewareService>(ROUTE_SYMBOL.MiddlewareService)
        .to(MiddlewareService)

    bind<IMiddlewareGroupService>(ROUTE_SYMBOL.MiddlewareGroupService)
        .to(MiddlewareGroupService)

    bind<IRouteService>(ROUTE_SYMBOL.RouteService)
        .to(RouteService)
})
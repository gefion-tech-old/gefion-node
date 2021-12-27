import { AsyncContainerModule, interfaces } from 'inversify'
import { Controller, Middleware, MiddlewareGroup, MiddlewareGroupMiddleware } from '../entities/route.entity'
import { ROUTE_SYMBOL } from './route.types'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'
import { IControllerService } from './controller/controller.interface'
import { ControllerService } from './controller/controller.service'
import { IMiddlewareService } from './middleware/middleware.interface'
import { MiddlewareService } from './middleware/middleware.service'
import { IMiddlewareGroupService } from './middleware-group/middleware-group.interface'
import { MiddlewareGroupService } from './middleware-group/middleware-group.service'

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

    bind<IControllerService>(ROUTE_SYMBOL.ControllerService)
        .to(ControllerService)

    bind<IMiddlewareService>(ROUTE_SYMBOL.MiddlewareService)
        .to(MiddlewareService)

    bind<IMiddlewareGroupService>(ROUTE_SYMBOL.MiddlewareGroupService)
        .to(MiddlewareGroupService)
})
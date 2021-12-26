import { AsyncContainerModule, interfaces } from 'inversify'
import { Controller, Middleware } from '../entities/route.entity'
import { ROUTE_SYMBOL } from './route.types'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'
import { IControllerService } from './controller/controller.interface'
import { ControllerService } from './controller/controller.service'
import { IMiddlewareService } from './middleware/middleware.interface'
import { MiddlewareService } from './middleware/middleware.service'

export const RouteModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<Function>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(Controller)
        .whenTargetNamed(ROUTE_SYMBOL.ControllerEntity)

    bind<Function>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(Middleware)
        .whenTargetNamed(ROUTE_SYMBOL.MiddlewareEntity)

    bind<IControllerService>(ROUTE_SYMBOL.ControllerService)
        .to(ControllerService)

    bind<IMiddlewareService>(ROUTE_SYMBOL.MiddlewareService)
        .to(MiddlewareService)
})
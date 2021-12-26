import { AsyncContainerModule, interfaces } from 'inversify'
import { Controller } from '../entities/route.entity'
import { ROUTE_SYMBOL } from './route.types'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'
import { IControllerService } from './controller/controller.interface'
import { ControllerService } from './controller/controller.service'

export const RouteModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<Function>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(Controller)
        .whenTargetNamed(ROUTE_SYMBOL.ControllerEntity)

    bind<IControllerService>(ROUTE_SYMBOL.ControllerService)
        .to(ControllerService)
})
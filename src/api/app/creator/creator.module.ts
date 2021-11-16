import { AsyncContainerModule, interfaces } from 'inversify'
import { ICreatorService } from './creator.interface'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'
import { CREATOR_SYMBOL } from './creator.types'
import { Creator } from '../entities/creator.entity'
import { CreatorService } from './creator.service'

export const CreatorModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<Function>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(Creator)
        .whenTargetNamed(CREATOR_SYMBOL.CreatorEntity)

    bind<ICreatorService>(CREATOR_SYMBOL.CreatorService)
        .to(CreatorService)
})
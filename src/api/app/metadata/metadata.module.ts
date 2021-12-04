import { AsyncContainerModule, interfaces } from 'inversify'
import { METADATA_SYMBOL } from './metadata.types'
import { Metadata } from '../entities/metadata.entity'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'

export const MetadataModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<Function>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(Metadata)
        .whenTargetNamed(METADATA_SYMBOL.MetadataEntity)
})
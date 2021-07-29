import { AsyncContainerModule, interfaces } from 'inversify'
import { getPackageStoreConfig } from './package-store.config'
import { PACKAGE_STORE_SYMBOL, PackageStoreConfig } from './package-store.types'
import { TYPEORM_SYMBOL, EntityType } from '../../dep/typeorm/typeorm.types'
import { Package } from './entities/package.entity'
import { PackageTag } from './entities/package-tag.entity'

export const PackageStoreModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<Promise<PackageStoreConfig>>(PACKAGE_STORE_SYMBOL.PackageStoreConfig)
        .toDynamicValue(getPackageStoreConfig)
        .inSingletonScope()

    bind<EntityType>(TYPEORM_SYMBOL.TypeOrmEntity)
        .toConstructor(Package)

    bind<EntityType>(TYPEORM_SYMBOL.TypeOrmEntity)
        .toConstructor(PackageTag)
})
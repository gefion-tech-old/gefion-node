import { AsyncContainerModule, interfaces } from 'inversify'
import { getPackageStoreConfig } from './package-store.config'
import { PACKAGE_STORE_SYMBOL, PackageStoreConfig } from './package-store.types'
import { TYPEORM_SYMBOL } from '../../dep/typeorm/typeorm.types'
import { Package } from './entities/package.entity'
import { PackageTag } from './entities/package-tag.entity'
import { Repository, EntitySchema, Connection } from 'typeorm'
import { PackageStoreService } from './package-store.service'
import { IPackageStoreService } from './package-store.interface'

export const PackageStoreModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<Promise<PackageStoreConfig>>(PACKAGE_STORE_SYMBOL.PackageStoreConfig)
        .toDynamicValue(getPackageStoreConfig)
        .inSingletonScope()

    bind<IPackageStoreService>(PACKAGE_STORE_SYMBOL.PackageStoreService)
        .to(PackageStoreService)

    // Сущности

    bind<EntitySchema<Package>>(TYPEORM_SYMBOL.TypeOrmEntity)
        .toConstructor(Package)
        .whenTargetNamed(PACKAGE_STORE_SYMBOL.PackageEntity)

    bind<EntitySchema<PackageTag>>(TYPEORM_SYMBOL.TypeOrmEntity)
        .toConstructor(PackageTag)
        .whenTargetNamed(PACKAGE_STORE_SYMBOL.PackageTagEntity)

    // Репозитории

    bind<Promise<Repository<Package>>>(TYPEORM_SYMBOL.TypeOrmRepository)
        .toDynamicValue(async (context: interfaces.Context): Promise<Repository<Package>> => {
            const container = context.container
            const connection = await container
                .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            const packageEntity = container
                .getNamed<EntitySchema<Package>>(
                    TYPEORM_SYMBOL.TypeOrmEntity, PACKAGE_STORE_SYMBOL.PackageEntity
                )
            const repository = connection.getRepository<Package>(packageEntity)
            return repository
        })
        .whenTargetNamed(PACKAGE_STORE_SYMBOL.PackageRepository)

    bind<Promise<Repository<PackageTag>>>(TYPEORM_SYMBOL.TypeOrmRepository)
        .toDynamicValue(async (context: interfaces.Context): Promise<Repository<PackageTag>> => {
            const container = context.container
            const connection = await container
                .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            const packageTagEntity = container
                .getNamed<EntitySchema<PackageTag>>(
                    TYPEORM_SYMBOL.TypeOrmEntity, PACKAGE_STORE_SYMBOL.PackageTagEntity
                )
            const repository = connection.getRepository<PackageTag>(packageTagEntity)
            return repository
        })
        .whenTargetNamed(PACKAGE_STORE_SYMBOL.PackageTagRepository)
})
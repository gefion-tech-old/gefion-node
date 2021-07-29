import 'reflect-metadata'
import { Container, interfaces } from 'inversify'
import { FsModule } from './dep/fs/fs.module'
import { GitModule } from './dep/git/git.module'
import { LoggerModule } from './dep/logger/logger.module'
import { PackageStoreModule } from './core/package-store/package-store.module'
import { TypeOrmModule } from './dep/typeorm/typeorm.module'

export async function initContainer(): Promise<interfaces.Container> {
    const container = new Container
    
    await container.loadAsync(
        FsModule,
        GitModule,
        LoggerModule,
        PackageStoreModule,
        TypeOrmModule
    )

    return container
}
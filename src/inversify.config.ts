import 'reflect-metadata'
import { Container, interfaces } from 'inversify'
import { FsModule } from './dep/fs/fs.module'
import { GitModule } from './dep/git/git.module'
import { LoggerModule } from './dep/logger/logger.module'
import { AsyncRetryModule } from './dep/async-retry/async-retry.module'
import { TypeOrmModule } from './dep/typeorm/typeorm.module'
import { ScheduleNodeModule } from './dep/schedule-node/schedule-node.module'
import { VM2Module } from './dep/vm2/vm2.module'
import { ScheduleModule } from './core/schedule/schedule.module'
import { InitModule } from './core/init/init.module'
import { RepairModule } from './core/repair/repair.module'
import { AtomicModule } from './core/atomic/atomic.module'
import { VMModule } from './core/vm/vm.module'

let container: interfaces.Container

export async function getContainer(): Promise<interfaces.Container> {
    if (!container) {
        container = new Container
        
        await container.loadAsync(
            FsModule,
            GitModule,
            LoggerModule,
            TypeOrmModule,
            ScheduleNodeModule,
            VM2Module,
            ScheduleModule,
            InitModule,
            RepairModule,
            AsyncRetryModule,
            AtomicModule,
            VMModule
        )
    }

    return container
}
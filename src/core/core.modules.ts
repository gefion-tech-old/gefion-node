import { AtomicModule } from './atomic/atomic.module'
import { InitModule } from './init/init.module'
import { RepairModule } from './repair/repair.module'
import { ScheduleModule } from './schedule/schedule.module'
import { TypeOrmModule } from './typeorm/typeorm.module'
import { VMModule } from './vm/vm.module'

export const CoreModules = [
    AtomicModule,
    InitModule,
    RepairModule,
    ScheduleModule,
    TypeOrmModule,
    VMModule
]
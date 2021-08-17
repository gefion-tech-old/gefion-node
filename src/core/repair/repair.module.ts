import { AsyncContainerModule, interfaces } from 'inversify'
import { REPAIR_TYPES, RepairConfig } from './repair.types'
import { getRepairConfig } from './repair.config'
import { SCHEDULE_SYMBOL, ScheduleJob } from '../schedule/schedule.types'
import { RepairSchedule } from './repair.schedule'
import { IRepairService } from './repair.interface'
import { RepairService } from './repair.service'
import { INIT_SYMBOL, InitRunner } from '../init/init.types'
import { RepairInit } from './repair.init'

export const RepairModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<Promise<RepairConfig>>(REPAIR_TYPES.RepairConfig)
        .toDynamicValue(getRepairConfig)
        .inSingletonScope()

    bind<IRepairService>(REPAIR_TYPES.RepairService)
        .to(RepairService)

    bind<ScheduleJob>(SCHEDULE_SYMBOL.ScheduleJob)
        .to(RepairSchedule)

    bind<InitRunner>(INIT_SYMBOL.InitRunner)
        .to(RepairInit)
})
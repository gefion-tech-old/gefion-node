import { AsyncContainerModule, interfaces } from 'inversify'
import { REPAIR_TYPES, RepairConfig } from './repair.types'
import { getRepairConfig } from './repair.config'
import { SCHEDULE_SYMBOL, ScheduleJob } from '../schedule/schedule.types'
import { RepairSchedule } from './repair.schedule'

export const RepairModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<Promise<RepairConfig>>(REPAIR_TYPES.RepairConfig)
        .toDynamicValue(getRepairConfig)
        .inSingletonScope()

    bind<ScheduleJob>(SCHEDULE_SYMBOL.ScheduleJob)
        .to(RepairSchedule)
})
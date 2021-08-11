import { AsyncContainerModule, interfaces } from 'inversify'
import { SCHEDULE_NODE_SYMBOL } from './schedule-node.types'
import schedule from 'node-schedule'

export const ScheduleNodeModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<typeof schedule>(SCHEDULE_NODE_SYMBOL.Schedule)
        .toConstantValue(schedule)
})
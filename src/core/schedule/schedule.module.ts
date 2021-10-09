import { AsyncContainerModule, interfaces } from 'inversify'
import { SCHEDULE_SYMBOL, ScheduleConfig } from './schedule.types'
import { getScheduleConfig } from './schedule.config'
import { IScheduleService } from './schedule.interface'
import { ScheduleService } from './schedule.service'
import { IJobRecorderService } from './job-recorder/job-recorder.interface'
import { JobRecorderService } from './job-recorder/job-recorder.service'
import { InitJobRecorder } from './job-recorder/job-recorder.init'
import { INIT_SYMBOL, InitRunner } from '../init/init.types'

export const ScheduleModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<Promise<ScheduleConfig>>(SCHEDULE_SYMBOL.ScheduleConfig)
        .toDynamicValue(getScheduleConfig)
        .inSingletonScope()

    bind<IScheduleService>(SCHEDULE_SYMBOL.ScheduleService)
        .to(ScheduleService)
        .inSingletonScope()

    bind<IJobRecorderService>(SCHEDULE_SYMBOL.JobRecorderService)
        .to(JobRecorderService)
        .inSingletonScope()

    bind<InitRunner>(INIT_SYMBOL.InitRunner)
        .to(InitJobRecorder)
        .whenTargetNamed(SCHEDULE_SYMBOL.JobRecorderInit)
})
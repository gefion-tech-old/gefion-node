import { interfaces } from 'inversify'
import { ScheduleConfig } from './schedule.types'
import { ScheduleJob, SCHEDULE_SYMBOL } from './schedule.types'

export async function getScheduleConfig(context: interfaces.Context): Promise<ScheduleConfig> {
    const container = context.container

    let jobs: ScheduleJob[] = []
    try {
        jobs = container
            .getAll<ScheduleJob>(SCHEDULE_SYMBOL.ScheduleJob)
    } catch {}
    
    return {
        jobs: jobs
    }
}
import { interfaces } from 'inversify'
import { RepairConfig, RepairJob, REPAIR_TYPES } from './repair.types'

export async function getRepairConfig(context: interfaces.Context): Promise<RepairConfig> {
    const container = context.container

    let repairJobs: RepairJob[] = []
    try {
        repairJobs = container
            .getAll<RepairJob>(REPAIR_TYPES.RepairJob)
    } catch {}

    return {
        repairJobs: repairJobs,
        recurrence: {
            second: (null as any)
        }
    }
}
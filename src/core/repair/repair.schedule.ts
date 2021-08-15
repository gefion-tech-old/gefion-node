import { injectable, inject } from 'inversify'
import { REPAIR_TYPES, RepairConfig } from './repair.types'
import { ScheduleJob, Recurrence } from '../schedule/schedule.types'

@injectable()
export class RepairSchedule implements ScheduleJob {

    public constructor(
        @inject(REPAIR_TYPES.RepairConfig)
        private config: Promise<RepairConfig>
    ) {}

    public name(): Symbol {
        return Symbol.for('RepairSchedule')
    }

    public async rules(): Promise<Recurrence> {
        const config = await this.config
        return config.recurrence
    }

    public async handler(): Promise<void> {
        const config = await this.config
        
        for (let repairJob of config.repairJobs) {
            try {
                if (await repairJob.test()) {
                    await repairJob.repair()
                }
            } catch(error) {
                throw {
                    repairJob: repairJob.name(),
                    error
                }
            }
        }
    }

} 
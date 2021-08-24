import { injectable, inject } from 'inversify'
import { REPAIR_TYPES, RepairConfig } from './repair.types'
import { ScheduleJob, Recurrence } from '../schedule/schedule.types'
import { IRepairService } from './repair.interface'

@injectable()
export class RepairSchedule implements ScheduleJob {

    public constructor(
        @inject(REPAIR_TYPES.RepairConfig)
        private config: Promise<RepairConfig>,

        @inject(REPAIR_TYPES.RepairService)
        private repairService: IRepairService
    ) {}

    public name(): Symbol {
        return Symbol('RepairSchedule')
    }

    public async rules(): Promise<Recurrence> {
        const config = await this.config
        return config.recurrence
    }

    public async handler(): Promise<void> {
        await this.repairService.run()
    }

} 
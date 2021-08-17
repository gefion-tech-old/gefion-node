import { injectable, inject } from 'inversify'
import { IRepairService } from './repair.interface'
import { REPAIR_TYPES, RepairConfig } from './repair.types'
import { RepairJobError } from './repair.errors'

@injectable()
export class RepairService implements IRepairService {

    public constructor(
        @inject(REPAIR_TYPES.RepairConfig)
        private config: Promise<RepairConfig>
    ) {}

    public async run(): Promise<void> {
        const config = await this.config
        
        for (let repairJob of config.repairJobs) {
            try {
                if (await repairJob.test()) {
                    await repairJob.repair()
                }
            } catch(error) {
                throw new RepairJobError(repairJob.name(), error)
            }
        }
    }

}
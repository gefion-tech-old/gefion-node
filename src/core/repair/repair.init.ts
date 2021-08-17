import { injectable, inject } from 'inversify'
import { InitRunner } from '../init/init.types'
import { IRepairService } from './repair.interface'
import { REPAIR_TYPES } from './repair.types'

@injectable()
export class RepairInit implements InitRunner {

    public constructor(
        @inject(REPAIR_TYPES.RepairService)
        private repairService: IRepairService
    ) {}

    public async run(): Promise<void> {
        await this.repairService.run()
    }

}
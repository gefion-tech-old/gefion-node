import { injectable, inject } from 'inversify'
import { RepairJob } from '../../repair/repair.types'
import { ATOMIC_SYMBOL } from '../atomic.types'
import { ILockCollectorService } from './lock-collector.interface'

@injectable()
export class LockCollectorRepair implements RepairJob {

    public constructor(
        @inject(ATOMIC_SYMBOL.LockCollectorService)
        private lockCollector: ILockCollectorService
    ) {}

    public name(): string {
        return 'Atomic:LockCollectorRepair'
    }

    public async test(): Promise<boolean> {
        return true
    }

    public async repair(): Promise<void> {
        await this.lockCollector.run()
    }

}
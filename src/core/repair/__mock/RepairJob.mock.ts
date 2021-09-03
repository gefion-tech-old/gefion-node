import { RepairJob } from '../repair.types'

export function getRepairJob(mock: {
    name: () => string
    test: () => boolean
    repair: () => void
}): RepairJob {
    return new class implements RepairJob {

        public name(): string {
            return mock.name()
        }

        public async test(): Promise<boolean> {
            return mock.test()
        }

        public async repair(): Promise<void> {
            return mock.repair()
        }

    }
}
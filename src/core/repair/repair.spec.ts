import { getContainer } from '../../inversify.config'
import { REPAIR_TYPES, RepairConfig } from './repair.types'
import { IRepairService } from './repair.interface'
import { RepairJob } from '../repair/repair.types'
import { RepairJobError } from './repair.errors'

class RepairJobSchedule implements RepairJob {

    constructor(
        private _name: string, 
        private _test: boolean,
        private _repair: () => void
    ) {}

    name() {
        return this._name
    }

    async test() {
        return this._test
    }

    async repair() {
        this._repair()
    }

}

class MyError extends Error {}

describe('Сервис для запуска заданий починки', () => {

    it('Задания починки запускаются корректно', async () => {
        const container = await getContainer()
        container.snapshot()

        let job1 = false, job2 = false

        container.rebind(REPAIR_TYPES.RepairConfig)
            .toDynamicValue(async (): Promise<RepairConfig> => {
                return {
                    repairJobs: [
                        new RepairJobSchedule('job1', true, () => job1 = true),
                        new RepairJobSchedule('job2', false, () => job2 = true)
                    ],
                    recurrence: {
                        second: (null as any)
                    }
                }
            })

        const repairService = container
            .get<IRepairService>(REPAIR_TYPES.RepairService)

        expect(job1).toBe(false)
        expect(job2).toBe(false)

        await repairService.run()

        expect(job1).toBe(true)
        expect(job2).toBe(false)

        container.restore()
    })



    /**
     * Стоит учитывать, что ошибка в одном задании прервёт выполнение
     * всех дальнейших заданий.
     */
    it('Ошибки в заданиях возвращаются в корректном формате', async () => {
        const container = await getContainer()
        container.snapshot()

        let job1 = false, job2 = false, job4 = false

        container.rebind(REPAIR_TYPES.RepairConfig)
            .toDynamicValue(async (): Promise<RepairConfig> => {
                return {
                    repairJobs: [
                        new RepairJobSchedule('job1', true, () => job1 = true),
                        new RepairJobSchedule('job2', false, () => job2 = true),
                        new RepairJobSchedule('job3', true, () => {
                            throw new MyError
                        }),
                        new RepairJobSchedule('job4', true, () => job4 = true)
                    ],
                    recurrence: {}
                }
            })

        const repairService = container
            .get<IRepairService>(REPAIR_TYPES.RepairService)

        expect(job1).toBe(false)
        expect(job2).toBe(false)
        expect(job4).toBe(false)

        await expect(repairService.run()).rejects.toBeInstanceOf(RepairJobError)

        expect(job1).toBe(true)
        expect(job2).toBe(false)
        expect(job4).toBe(false)

        container.restore()
    })

})
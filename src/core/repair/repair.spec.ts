import { getContainer } from '../../inversify.config'
import { REPAIR_TYPES } from './repair.types'
import { IRepairService } from './repair.interface'
import { RepairJobError } from './repair.errors'
import { getRepairConfig } from './__mock/RepairConfig.mock'
import { getRepairJob } from './__mock/RepairJob.mock'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()

    container.rebind(REPAIR_TYPES.RepairConfig)
        .toDynamicValue(getRepairConfig({
            repairJobs: [],
            recurrence: {
                second: (null as any)
            }
        }))
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('Сервис для запуска заданий починки', () => {

    it('Задания починки запускаются корректно #cold', async () => {
        const container = await getContainer()
        container.snapshot()

        let job1 = false, job2 = false

        container.rebind(REPAIR_TYPES.RepairConfig)
            .toDynamicValue(getRepairConfig({
                repairJobs: [
                    getRepairJob({
                        name: () => 'job1',
                        test: () => true,
                        repair: () => job1 = true
                    }),
                    getRepairJob({
                        name: () => 'job2',
                        test: () => false,
                        repair: () => job2 = true
                    }),
                ],
                recurrence: {
                    second: (null as any)
                }
            }))

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
    it('Ошибки в заданиях обрабатываются корректно #cold', async () => {
        const container = await getContainer()
        container.snapshot()

        let job1 = false, job2 = false, job4 = false
        const MyError = class extends Error {}

        container.rebind(REPAIR_TYPES.RepairConfig)
            .toDynamicValue(getRepairConfig({
                repairJobs: [
                    getRepairJob({
                        name: () => 'job1',
                        test: () => true,
                        repair: () => job1 = true
                    }),
                    getRepairJob({
                        name: () => 'job2',
                        test: () => false,
                        repair: () => job2 = true
                    }),
                    getRepairJob({
                        name: () => 'job3',
                        test: () => true,
                        repair: () => {
                            throw new MyError
                        }
                    }),
                    getRepairJob({
                        name: () => 'job4',
                        test: () => true,
                        repair: () => job4 = true
                    }),
                ],
                recurrence: {
                    second: (null as any)
                }
            }))

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
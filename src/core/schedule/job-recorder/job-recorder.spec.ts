import { getContainer } from '../../../inversify.config'
import { IJobRecorderService } from './job-recorder.interface'
import { 
    SCHEDULE_SYMBOL, 
    Recurrence, 
    JobHandler 
} from '../schedule.types'
import { ReRegistrationJobError } from './job-recorder.errors'
import { getScheduleConfig } from '../__mock/ScheduleConfig.mock'
import { getScheduleService } from '../__mock/ScheduleService.mock'
import { getScheduleJob } from '../__mock/ScheduleJob.mock'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()

    container.rebind(SCHEDULE_SYMBOL.ScheduleConfig)
        .toDynamicValue(getScheduleConfig({
            jobs: []
        }))

    container.rebind(SCHEDULE_SYMBOL.ScheduleService)
        .to(getScheduleService({
            has: () => false,
            invoke: () => {},
            remove: () => {},
            schedule: () => {},
            stats: () => undefined
        }))
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('Регистратор заданий в планировщике', () => {

    it('Задания успешно регистрируются #cold', async () => {
        const container = await getContainer()
        container.snapshot()

        let name: Symbol | undefined
        let rules: Recurrence | undefined
        let handler: JobHandler | undefined

        container.rebind(SCHEDULE_SYMBOL.ScheduleService)
            .to(getScheduleService({
                has: () => false,
                invoke: () => {},
                remove: () => {},
                schedule: (n: Symbol, r: Recurrence, h: JobHandler) => {
                    name = n
                    rules = r
                    handler = h
                },
                stats: () => undefined
            }))

        container.rebind(SCHEDULE_SYMBOL.ScheduleConfig)
            .toDynamicValue(getScheduleConfig({
                jobs: [
                    getScheduleJob({
                        name: () => Symbol('Name'),
                        rules: () => new Date(),
                        handler: () => {}
                    })
                ]
            }))

        const jobRecorder = container
            .get<IJobRecorderService>(SCHEDULE_SYMBOL.JobRecorderService)

        await jobRecorder.schedule()

        expect(typeof name).toBe('symbol')
        expect(rules).toBeInstanceOf(Date)
        expect(typeof handler).toBe('function')

        container.restore()
    })

    it('Повторная регистрация вызывает ошибку #cold', async () => {
        const container = await getContainer()
        container.snapshot()

        const jobRecorder = container
            .get<IJobRecorderService>(SCHEDULE_SYMBOL.JobRecorderService)

        await expect(jobRecorder.schedule()).resolves.toBeUndefined()
        await expect(jobRecorder.schedule()).rejects.toBeInstanceOf(ReRegistrationJobError)

        container.restore()
    })

})
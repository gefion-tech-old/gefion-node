import { getContainer } from '../../../inversify.config'
import { IJobRecorderService } from './job-recorder.interface'
import { SCHEDULE_SYMBOL, ScheduleConfig, ScheduleJob } from '../schedule.types'
import { ReRegistrationError } from './job-recorder.errors'

describe('Регистратор заданий в планировщике', () => {

    it('Задания успешно регистрируются #cold', async () => {
        const container = await getContainer()
        container.snapshot()

        let scheduleParams: any[] = []

        container.rebind(SCHEDULE_SYMBOL.ScheduleService)
            .toConstantValue({
                schedule: (...params: any[]) => {
                    scheduleParams = params
                }
            })

        container.rebind(SCHEDULE_SYMBOL.ScheduleConfig)
            .toDynamicValue(async (): Promise<ScheduleConfig> => {
                return {
                    logger: ({} as any),
                    jobs: [
                        ({
                            name: () => Symbol('Name'),
                            rules: async () => new Date(),
                            handler: async () => void true
                        } as ScheduleJob)
                    ]
                }
            })

        const jobRecorder = container
            .get<IJobRecorderService>(SCHEDULE_SYMBOL.JobRecorderService)

        await jobRecorder.schedule()

        let [name, rules, handler] = scheduleParams

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
        await expect(jobRecorder.schedule()).rejects.toThrowError(ReRegistrationError)

        container.restore()
    })

})
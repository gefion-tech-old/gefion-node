import { injectable, inject } from 'inversify'
import { IJobRecorderService } from './job-recorder.interface'
import { SCHEDULE_SYMBOL, ScheduleConfig } from '../schedule.types'
import { IScheduleService } from '../schedule.interface'
import { ReRegistrationJobError } from './job-recorder.errors'

@injectable()
export class JobRecorderService implements IJobRecorderService {

    public constructor(
        @inject(SCHEDULE_SYMBOL.ScheduleConfig)
        private config: Promise<ScheduleConfig>,

        @inject(SCHEDULE_SYMBOL.ScheduleService)
        private scheduleService: IScheduleService
    ) {}

    private isCallSchedule = false

    public async schedule() {
        if (this.isCallSchedule) {
            throw new ReRegistrationJobError
        }
        this.isCallSchedule = true

        const config = await this.config

        for (let job of config.jobs) {
            this.scheduleService.schedule(
                job.name(),
                await job.rules(),
                async () => {
                    await job.handler()
                }
            )
        }
    }

}
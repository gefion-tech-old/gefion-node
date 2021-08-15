import { injectable, inject } from 'inversify'
import { IJobRecorderService } from './job-recorder.interface'
import { SCHEDULE_SYMBOL, ScheduleConfig } from '../schedule.types'
import { IScheduleService } from '../schedule.interface'
import { ReRegistrationError } from './job-recorder.errors'

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
            throw new ReRegistrationError
        }
        this.isCallSchedule = true

        const config = await this.config

        config.jobs.forEach((job) => {
            this.scheduleService.schedule(
                job.name(),
                job.rules(),
                job.handler
            )
        })
    }

}
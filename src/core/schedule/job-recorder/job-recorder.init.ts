import { injectable, inject } from 'inversify'
import { InitRunner } from '../../init/init.types'
import { SCHEDULE_SYMBOL } from '../schedule.types'
import { IJobRecorderService } from './job-recorder.interface'

@injectable()
export class InitJobRecorder implements InitRunner {

    public constructor(
        @inject(SCHEDULE_SYMBOL.JobRecorderService)
        private jobRecorder: IJobRecorderService
    ) {}

    async run(): Promise<void> {
        await this.jobRecorder.schedule()
    }

}
import { injectable, inject } from 'inversify'
import { IScheduleService } from './schedule.interface'
import { Recurrence, SCHEDULE_SYMBOL, ScheduleConfig, JobHandler, JobStats } from './schedule.types'
import { IncorrectRecurrence } from './schedule.errors'
import Schedule from 'node-schedule'
import { SCHEDULE_NODE_SYMBOL } from '../../dep/schedule-node/schedule-node.types'

@injectable()
export class ScheduleService implements IScheduleService {

    private jobs: Map<Symbol, { job: Schedule.Job, stats: JobStats }>

    public constructor(
        @inject(SCHEDULE_NODE_SYMBOL.Schedule)
        private nodeSchedule: typeof Schedule,

        @inject(SCHEDULE_SYMBOL.ScheduleConfig)
        private config: Promise<ScheduleConfig>
    ) {
        this.jobs = new Map
    }

    private eventRun(name: Symbol) {
        const job = this.jobs.get(name)

        if (!job) {
            return
        }

        job.stats.run++

        if (!job.job.nextInvocation()) {
            this.remove(name)
        }
    }

    private eventError(name: Symbol, error: any) {
        const job = this.jobs.get(name)
        
        if (!job) {
            return
        }

        job.stats.error++

        if (!job.job.nextInvocation()) {
            this.remove(name)
        }
        
        (async () => {
            const config = await this.config
            config.logger.error({
                jobName: name,
                error: error
            })
        })()
    }

    public schedule(name: Symbol, recurrence: Recurrence, callback: JobHandler) {
        const job = this.nodeSchedule.scheduleJob(recurrence, callback)

        if (!job) {
            throw new IncorrectRecurrence()
        }
        
        const stats = {
            error: 0,
            run: 0
        }
        this.jobs.set(name, {job, stats})
        
        job.on('run', () => {
            this.eventRun(name)
        })

        job.on('error', (error) => {
            this.eventError(name, error)
        })
    }

    public remove(name: Symbol) {
        const job = this.jobs.get(name)

        if (!job) {
            return
        }

        job.job.cancel()
        this.jobs.delete(name)
    }

    public invoke(name: Symbol) {
        const job = this.jobs.get(name)

        if (!job) {
            return
        }

        try {
            job.job.invoke()
            this.eventRun(name)
        } catch (error) {
            this.eventError(name, error)
        }
    }

    public has(name: Symbol): boolean {
        const job = this.jobs.get(name)
        return job ? true : false
    }

    public stats(name: Symbol): JobStats | undefined {
        const job = this.jobs.get(name)

        if (!job) {
            return
        }

        return job.stats
    }

}
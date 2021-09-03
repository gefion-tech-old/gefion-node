import { injectable } from 'inversify'
import { IScheduleService } from '../schedule.interface'
import { JobHandler, Recurrence, JobStats } from '../schedule.types'

export function getScheduleService(mock: {
    schedule: (name: Symbol, recurrence: Recurrence, callback: JobHandler) => void
    remove: (name: Symbol) => void
    invoke: (name: Symbol) => void
    has: (name: Symbol) => boolean
    stats: (name: Symbol) => JobStats | undefined
}): new() => IScheduleService {
    @injectable()
    class ScheduleService implements IScheduleService {

        public schedule(name: Symbol, recurrence: Recurrence, callback: JobHandler): void {
            mock.schedule(name, recurrence, callback)
        }

        public remove(name: Symbol): void {
            mock.remove(name)
        }

        public invoke(name: Symbol): void {
            mock.invoke(name)
        }

        public has(name: Symbol): boolean {
            return mock.has(name)
        }

        public stats(name: Symbol): JobStats | undefined {
            return mock.stats(name)
        }

    }

    return ScheduleService
}
import { ScheduleJob, Recurrence } from '../schedule.types'

export function getScheduleJob(mock: {
    name: () => symbol
    rules: () => Recurrence
    handler: () => void
}): ScheduleJob {
    return new class implements ScheduleJob {

        public name(): symbol {
            return mock.name()
        }

        public async rules(): Promise<Recurrence> {
            return mock.rules()
        }

        public async handler(): Promise<void> {
            mock.handler()
        }

    }
}
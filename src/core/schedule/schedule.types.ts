import { 
    RecurrenceRule,
    RecurrenceSpecDateRange,
    RecurrenceSpecObjLit
} from 'node-schedule'
import { Logger } from 'pino'

export const SCHEDULE_SYMBOL = {
    ScheduleService: Symbol.for('ScheduleService'),
    ScheduleConfig: Symbol.for('ScheduleConfig')
}

export type Recurrence = RecurrenceRule | RecurrenceSpecDateRange | RecurrenceSpecObjLit | Date | number

export type JobHandler = () => void | Promise<void>

export type JobStats = {
    /**
     * Количество раз, когда задание успешно было запущено
     */
    run: number
    /**
     * Количество раз, когда задание завершилось ошибкой
     */
    error: number
}

export type ScheduleConfig = {
    logger: Logger
}
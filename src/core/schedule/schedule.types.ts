import { 
    RecurrenceRule,
    RecurrenceSpecDateRange,
    RecurrenceSpecObjLit
} from 'node-schedule'

export const SCHEDULE_SYMBOL = {
    ScheduleService: Symbol('ScheduleService'),
    ScheduleConfig: Symbol('ScheduleConfig'),
    ScheduleJob: Symbol('ScheduleJob'),
    JobRecorderService: Symbol('JobRecorderService')
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
    readonly jobs: ScheduleJob[]
}

export interface ScheduleJob {

    /**
     * Идентификатор задания
     */
    name(): Symbol

    /**
     * Правила повторения
     */
    rules(): Promise<Recurrence>

    /**
     * Обработчик задания
     */
    handler(): Promise<void>

}
import { JobStats, Recurrence, JobHandler } from './schedule.types'

export interface IScheduleService {

    /**
     * Запланировать задание. Если задание одноразовое, то оно полностью
     * удаляется после своего исполнения
     */
    schedule(name: Symbol, recurrence: Recurrence, callback: JobHandler): void

    /**
     * Удалить задание
     */
    remove(name: Symbol): void

    /**
     * Запустить задание вне планирования
     */
    invoke(name: Symbol): void

    /**
     * Проверить существование задания
     */
    has(name: Symbol): boolean

    /**
     * Получить статистику по заданию
     */
    stats(name: Symbol): JobStats | undefined

}
import { Recurrence } from '../schedule/schedule.types'

export const REPAIR_TYPES = {
    RepairJob: Symbol('RepairJob'),
    RepairConfig: Symbol('RepairConfig'),
    RepairService: Symbol('RepairService'),
    RepairInit: Symbol('RepairInit')
}

export interface RepairJob {

    /**
     * Название или краткая метаинформация для идентификации задания
     * в логах
     */
    name(): string

    /**
     * Запускается перед вызовом функции repair, чтобы выяснить
     * должна ли она вызываться
     */
    test(): Promise<boolean>

    /**
     * Основная функция для размещения стабилизирующего кода
     */
    repair(): Promise<void>

}

export type RepairConfig = {
    /**
     * Список заданий
     */
    readonly repairJobs: RepairJob[],
    /**
     * Как часто будут запускаться задания починки
     */
    readonly recurrence: Recurrence
}
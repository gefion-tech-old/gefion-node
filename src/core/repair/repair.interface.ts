export interface IRepairService {

    /**
     * Запустить все зарегистрированные задания починки
     */
    run(): Promise<void>

}
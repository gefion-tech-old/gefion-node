export interface ILockCollectorService {

    /**
     * Запустить сборщик всех устаревших блокировок
     */
    run(): Promise<void>

}
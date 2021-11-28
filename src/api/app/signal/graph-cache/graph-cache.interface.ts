import { Signal } from '../../entities/signal.entity'

export interface IGraphCacheService {

    /**
     * Вызывать коллбэк для всех сигналов по направлению их рёбер начиная с указанного сигнала. 
     * Игнорировать повторяющиеся сигналы и исключать отклонённые сигналы и все сигналы на которые ссылаются
     * только отклонённые сигналы.
     * 
     * Если указанного сигнала нет в кэше, то callback не вызывается, а вызов функции возвращает
     * false. В противном случае, вызывается callback, а после возвращается true
     */
    signalDirection(signalId: number, callback: (signal: Signal) => Promise<boolean>): Promise<boolean>

    /**
     * Обновить кеш указанного сигнала
     */
    updateSignal(signalId: number): Promise<void>

    /**
     * Обновить кеш всех сигналов за раз
     */
    updateSignals(): Promise<void>

    /**
     * Синхронизация кеша сигнала на всех экземплярах приложения с его параллельным 
     * обновлением
     */
    updateSignalAndSync(signalId: number): Promise<void>

    /**
     * Полное обновление и синхронизация кеша всех сигналов на всех экземплярах приложения
     */
    updateSignalsAndSync(): Promise<void>

}
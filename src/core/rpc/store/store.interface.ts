import { StoreInfo } from './store.types'

export interface IStoreService {

    /**
     * Получить идентификатор текущего приложения
     */
    getAppId(): Promise<string>

    /**
     * Синхронизировать информацию экземпляров приложения с базой данных
     */
    sync(): Promise<StoreInfo>

    /**
     * Получить массив портов экземлпяров приложения. Без порта текущего приложения
     */
    getPorts(): Promise<number[]>

    /**
     * Удалить указанный порт из списка портов. Результат фиксируется в базе данных
     */
    removePort(port: number): Promise<void>

}
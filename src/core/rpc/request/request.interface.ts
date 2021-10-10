import { RPCResponseHttpType } from '../rpc.types'
import { RPCOptions, SyncOptions } from './request.types'

export interface IRequestService {

    /**
     * Запрос на синхронизацию указанного экземпляра.
     */
    sync(option: SyncOptions): Promise<void>

    /**
     * Сделать rpc запрос на указанный экземпляр
     */
    rpc(option: RPCOptions): Promise<RPCResponseHttpType | undefined>

}
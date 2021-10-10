import { injectable, inject } from 'inversify'
import { InitRunner } from '../init/init.types'
import { RPC_SYMBOL } from './rpc.types'
import { IStoreService } from './store/store.interface'
import { IRequestService } from './request/request.interface'

/**
 * Инициализировать экземпляр, а после уведомлять все запущенные экземпляры о
 * том, что запустился ещё один экземпляр
 */
@injectable()
export class RPCInit implements InitRunner {

    public constructor(
        @inject(RPC_SYMBOL.RPCStoreService)
        private storeService: IStoreService,

        @inject(RPC_SYMBOL.RPCRequestService)
        private requestService: IRequestService
    ) {}

    public async run(): Promise<void> {
        const { appId, ports } = await this.storeService.sync()

        await Promise.all(ports.map(port => {
            return this.requestService.sync({
                port: port,
                appId: appId
            })
        }))
    }

}
import { injectable, inject } from 'inversify'
import { InitRunner } from '../init/init.types'
import { RPC_SYMBOL, IRPCMethod } from './rpc.types'
import { IStoreService } from './store/store.interface'
import { IRequestService } from './request/request.interface'
import { IRPCService } from './rpc.interface'
import { getContainer } from '../../inversify.config'

@injectable()
export class RPCInit implements InitRunner {

    public constructor(
        @inject(RPC_SYMBOL.RPCStoreService)
        private storeService: IStoreService,

        @inject(RPC_SYMBOL.RPCRequestService)
        private requestService: IRequestService,

        @inject(RPC_SYMBOL.RPCService)
        private rpcService: IRPCService
    ) {}

    public async run(): Promise<void> {
        /**
         * Инициализировать экземпляр, а после уведомлять все запущенные экземпляры о
         * том, что запустился ещё один экземпляр
         */
        {
            const { appId, ports } = await this.storeService.sync()
    
            await Promise.all(ports.map(port => {
                return this.requestService.sync({
                    port: port,
                    appId: appId
                })
            }))
        }

        /**
         * Зарегистрировать RPC методы различных модулей
         */

        let methods: IRPCMethod[] = []
        try {
            methods = (await getContainer())
                .getAll<IRPCMethod>(RPC_SYMBOL.RPCMethod)
        } catch {}

        for (const method of methods) {
            this.rpcService.method(method.name(), method.handler)
        }
    }

}
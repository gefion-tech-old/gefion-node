import { injectable, inject } from 'inversify'
import { InitRunner } from '../init/init.types'
import { RPC_SYMBOL } from './rpc.types'
import { IStoreService } from './store/store.interface'
import got from 'got'

/**
 * Инициализировать экземпляр, а после уведомлять все запущенные экземпляры о
 * том, что запустился ещё один экземпляр
 */
@injectable()
export class RPCInit implements InitRunner {

    public constructor(
        @inject(RPC_SYMBOL.RPCStoreService)
        private storeService: IStoreService
    ) {}

    public async run(): Promise<void> {
        const { appId, ports } = await this.storeService.sync()

        /**
         * Запрос на синхронизацию указанного экземпляра. Все ошибки игнорировать,
         * их логирует сам целевой экземпляр
         */
        const syncRequest = async (port: number): Promise<void> => {
            const remote = `http://localhost:${port}/api/v1/rpc/sync`

            try {
                await got.post(remote, {
                    json: {
                        appId: appId
                    }
                })
            } catch {}
        }

        await Promise.all(ports.map(port => syncRequest(port)))
    }

}
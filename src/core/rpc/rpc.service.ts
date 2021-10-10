import { injectable, inject } from 'inversify'
import { IRPCService } from './rpc.interface'
import { 
    RPCHandler, 
    RPCResponseHttpType,
    RPC_SYMBOL
} from './rpc.types'
import {
    MoreThenOneHandlerError,
    MethodDoesNotExistsError
} from './rpc.errors'
import { IStoreService } from './store/store.interface'
import { IRequestService } from './request/request.interface'

@injectable()
export class RPCService implements IRPCService {

    private methods = new Map<string, RPCHandler>()

    public constructor(
        @inject(RPC_SYMBOL.RPCStoreService)
        private storeService: IStoreService,

        @inject(RPC_SYMBOL.RPCRequestService)
        private requestService: IRequestService
    ) {}

    public method(name: string, handler: RPCHandler): void {
        if (this.methods.has(name)) {
            throw new MoreThenOneHandlerError(name)
        }

        this.methods.set(name, handler)
    }

    public async call(method: string, params: any[]): Promise<RPCResponseHttpType[]> {
        if (!this.methods.has(method)) {
            throw new MethodDoesNotExistsError(method)
        }

        /**
         * Сделать запросы на указанные экземпляры. Удалить порт экземпляра, если в результате запроса
         * произошла какая-либо ошибка, которую не проигнорировал сервис запроса
         */
        const rpcRequest = async (port: number): Promise<RPCResponseHttpType | undefined> => {
            try {
                return await this.requestService.rpc({
                    appId: await this.storeService.getAppId(),
                    method: method,
                    params: params,
                    port: port
                })
            } catch {
                this.storeService.removePort(port)
            }

            return
        }

        /**
         * Получить список ответов в результате выполнения rpc запросов
         */
        const responses = await (async (): Promise<RPCResponseHttpType[]> => {
            const ports = await this.storeService.getPorts()
            
            return (await Promise.all(
                ports.map(port => rpcRequest(port))
            )).filter((response): response is RPCResponseHttpType => {
                return Boolean(response)
            })
        })()

        return responses
    }

    public async localCall(method: string, params: any[]): Promise<any> {
        const handler = this.methods.get(method)

        if (!handler) {
            throw new MethodDoesNotExistsError(method)
        }

        return await handler(...params)
    }

}
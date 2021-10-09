import { injectable, inject } from 'inversify'
import { IRPCService } from './rpc.interface'
import { 
    RPCHandler, 
    RPCResponseHttpType,
    RPC_SYMBOL
} from './rpc.types'
import {
    MoreThenOneHandlerError,
    MethodDoesNotExistsError,
    MethodLocalCallError
} from './rpc.errors'
import { IStoreService } from './store/store.interface'
import got from 'got'

@injectable()
export class RPCService implements IRPCService {

    private methods = new Map<string, RPCHandler>()

    public constructor(
        @inject(RPC_SYMBOL.RPCStoreService)
        private storeService: IStoreService
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
         * Сделать запросы на указанные экземпляры. Предполагается, что все они
         * находятся на одной машине.
         */
        const rpcRequest = async (port: number): Promise<RPCResponseHttpType | undefined> => {
            const url = `http://localhost:${port}/api/v1/rpc`
            
            try {
                return await got.post<RPCResponseHttpType>(url, {
                    json: {
                        method: method,
                        params: params,
                        appId: await this.storeService.getAppId()
                    }
                }).json()
            } catch(error) {
                /**
                 * Если ошибка является неожиданной ошибкой при попытке вызвать обработчик
                 * rpc, то это частный случай, а экземпляр приложения рабочий. Эту ошибку нужно
                 * игнорировать. Она логируется на целевом экземпляре приложения
                 */
                if (error instanceof got.HTTPError) {
                    if (error.response.statusCode >= 500) {
                        const remoteError: {
                            error: {
                                name: string
                                message: string
                            }
                        } = JSON.parse(error.response.body as string)

                        if (remoteError.error.name === 'UnexceptedRPCHandlerError') {
                            return
                        }
                    }
                }

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

        try {
            return await handler(...params)
        } catch(error) {
            throw new MethodLocalCallError(method, error)
        }
    }

}
import { interfaces } from 'inversify'
import { FastifyPluginAsync } from 'fastify'
import { 
    RPC_SYMBOL, 
    RPCRequestHttpType, 
    RPCResponseHttpType,
    RPCSyncRequest
} from './rpc.types'
import { IStoreService } from './store/store.interface'
import { 
    DifferentAppIdsError,
    ErrorInMethod,
    UnexceptedRPCHandlerError
} from './rpc.errors'
import { IRPCService } from './rpc.interface'
import { getSerializableErrorFormat } from '../../utils/error-format'

export async function getRpcHttpPlugin(context: interfaces.Context): Promise<FastifyPluginAsync> {
    const container = context.container
    
    return async function(instance) {
        /**
         * Маршрут вызова rpc методов
         */
        instance.post<{
            Body: RPCRequestHttpType
        }>('/v1/rpc', {
            schema: {
                body: {
                    type: 'object',
                    required: ['method', 'params', 'appId'],
                    properties: {
                        method: { type: 'string' },
                        params: { type: 'array' },
                        appId: { type: 'string' }
                    }
                }
            },
            handler: async (request): Promise<RPCResponseHttpType> => {
                const storeService = container
                    .get<IStoreService>(RPC_SYMBOL.RPCStoreService)
                const rpcService = container
                    .get<IRPCService>(RPC_SYMBOL.RPCService)

                if (request.body.appId !== await storeService.getAppId()) {
                    throw new DifferentAppIdsError()
                }

                const response: RPCResponseHttpType = {
                    result: null,
                    error: null
                }

                try {
                    response.result = await rpcService.localCall(request.body.method, request.body.params)
                } catch(error) {
                    /**
                     * Если ошибка не является экземпляром класса ErrorInMethod, то это неожиданная 
                     * ошибка
                     */
                    if (!(error instanceof ErrorInMethod)) {
                        throw new UnexceptedRPCHandlerError(error)
                    }

                    response.error = getSerializableErrorFormat(error)
                }

                return response
            }
        })
        
        /**
         * Маршрут для синхронизации rpc адресов. Вызывается при старте нового экземпляра
         * приложения, чтобы оповестить об этом все уже работающие экземпляры
         */
        instance.post<{
            Body: RPCSyncRequest
        }>('/v1/rpc/sync', {
            schema: {
                body: {
                    type: 'object',
                    required: ['appId'],
                    properties: {
                        appId: { type: 'string' }
                    }
                }
            },
            handler: async function(request): Promise<{}> {
                const storeService = container
                    .get<IStoreService>(RPC_SYMBOL.RPCStoreService)

                if (request.body.appId !== await storeService.getAppId()) {
                    throw new DifferentAppIdsError()
                }

                await storeService.sync()

                return {}
            }
        })
    }
}

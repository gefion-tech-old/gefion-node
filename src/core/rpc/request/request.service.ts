import { injectable } from 'inversify'
import { IRequestService } from './request.interface'
import { SyncOptions, RPCOptions } from './request.types'
import { RPCResponseHttpType } from '../rpc.types'
import { HTTPError } from 'got'
import { getDefaultGot } from '../../../utils/got'

@injectable()
export class RequestService implements IRequestService {

    public async sync(options: SyncOptions): Promise<void> {
        const remote = `http://localhost:${options.port}/api/v1/rpc/sync`

        /**
         * Все http ошибки игнорировать, потому что их логирует сам экземпляр
         */
        try {
            await getDefaultGot().post(remote, {
                json: {
                    appId: options.appId
                },
                context: {
                    meta: {
                        id: 'RPCModule:RequestService:sync'
                    }
                }
            })
        } catch(error) {
            if (!(error instanceof HTTPError)) {
                throw error
            }
        }
    }

    public async rpc(options: RPCOptions): Promise<RPCResponseHttpType | undefined> {
        const url = `http://localhost:${options.port}/api/v1/rpc`
            
        /**
         * Если ошибка является неожиданной ошибкой при попытке вызвать обработчик
         * rpc, то это частный случай, а экземпляр приложения рабочий. Эту ошибку нужно
         * игнорировать. Она логируется на целевом экземпляре приложения и ничего не говорит
         * о работоспособности приложения
         */
        try {
            return await getDefaultGot().post<RPCResponseHttpType>(url, {
                json: {
                    method: options.method,
                    params: options.params,
                    appId: options.appId
                },
                context: {
                    meta: {
                        id: 'RPCModule:RequestService:rpc'
                    }
                }
            }).json()
        } catch(error) {
            if (error instanceof HTTPError) {
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

            throw error
        }
    }

}
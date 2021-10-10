import { injectable } from 'inversify'
import { IRequestService } from './request.interface'
import { SyncOptions, RPCOptions } from './request.types'
import { RPCResponseHttpType } from '../rpc.types'
import got from 'got'

@injectable()
export class RequestService implements IRequestService {

    public async sync(options: SyncOptions): Promise<void> {
        const remote = `http://localhost:${options.port}/api/v1/rpc/sync`

        /**
         * Все http ошибки игнорировать, потому что их логирует сам экземпляр
         */
        try {
            await got.post(remote, {
                json: {
                    appId: options.appId
                }
            })
        } catch(error) {
            if (!(error instanceof got.HTTPError)) {
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
            return await got.post<RPCResponseHttpType>(url, {
                json: {
                    method: options.method,
                    params: options.params,
                    appId: options.appId
                }
            }).json()
        } catch(error) {
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

            throw error
        }
    }

}
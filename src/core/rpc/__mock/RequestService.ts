import { injectable } from 'inversify'
import { 
    RPCResponseHttpType
 } from '../rpc.types'
import { IRequestService } from '../request/request.interface'
import {
    RPCOptions,
    SyncOptions
} from '../request/request.types'

export function getRequestService(mock: {
    sync: (options: SyncOptions) => Promise<void>
    rpc: (options: RPCOptions) => Promise<RPCResponseHttpType | undefined>
}): new() => IRequestService {
    @injectable()
    class RequestService implements IRequestService {

        public async sync(options: SyncOptions): Promise<void> {
            await mock.sync(options)
        }

        public async rpc(options: RPCOptions): Promise<RPCResponseHttpType | undefined> {
            return await mock.rpc(options)
        }

    }

    return RequestService
}
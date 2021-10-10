import { injectable } from 'inversify'
import { IRPCService } from '../rpc.interface'
import { 
    RPCHandler,
    RPCResponseHttpType
} from '../rpc.types'

export function getRPCService(mock: {
    method: (name: string, handler: RPCHandler) => Promise<void>
    call: (method: string, params: any[]) => Promise<RPCResponseHttpType[]>
    localCall: (method: string, params: any[]) => Promise<any>
}): new() => IRPCService {
    @injectable()
    class RPCService implements IRPCService {

        public async method(name: string, handler: RPCHandler): Promise<void> {
            return mock.method(name, handler)
        }

        public async call(method: string, params: any[]): Promise<RPCResponseHttpType[]> {
            return mock.call(method, params)
        }

        public async localCall(method: string, params: any[]): Promise<any> {
            return mock.localCall(method, params)
        }

    }

    return RPCService
}
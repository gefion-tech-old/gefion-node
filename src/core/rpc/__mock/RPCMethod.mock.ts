import { injectable } from 'inversify'
import { IRPCMethod, RPCHandler } from '../rpc.types'

export function getRPCMethod(mock: {
    name: () => string
    handler: RPCHandler
}): new() => IRPCMethod {
    @injectable()
    class Method implements IRPCMethod {

        public name(): string {
            return mock.name()
        }

        public async handler(...params: any[]): Promise<any> {
            return mock.handler(...params)
        }

    }

    return Method
}
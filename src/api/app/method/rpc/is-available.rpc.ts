import { injectable, inject } from 'inversify'
import { IRPCMethod } from '../../../../core/rpc/rpc.types'
import { Method, METHOD_SYMBOL, RPCMethodsMethodService } from '../method.types'
import { IMethodService } from '../method.interface'

@injectable()
export class IsAvailableRPCMethod implements IRPCMethod {

    public constructor(
        @inject(METHOD_SYMBOL.MethodService)
        private methodService: IMethodService
    ) {}

    public name(): string {
        return RPCMethodsMethodService.isAvailable
    }

    public async handler(method: Method): Promise<boolean> {
        return this.methodService.isAvailable(method)
    }

} 
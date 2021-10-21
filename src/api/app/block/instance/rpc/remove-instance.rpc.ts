import { injectable, inject } from 'inversify'
import { IRPCMethod } from '../../../../../core/rpc/rpc.types'
import { BLOCK_SYMBOL } from '../../block.types'
import { IInstanceService } from '../instance.interface'
import { InstanceId, RPCMethodsInstanceService } from '../instance.types'

@injectable()
export class RemoveInstanceRPCMethod implements IRPCMethod {

    public constructor(
        @inject(BLOCK_SYMBOL.BlockInstanceService)
        private instanceService: IInstanceService
    ) {}

    public name(): string {
        return RPCMethodsInstanceService.remove
    }

    public async handler(instanceId: InstanceId): Promise<void> {
        await this.instanceService.remove(instanceId)
    }

}
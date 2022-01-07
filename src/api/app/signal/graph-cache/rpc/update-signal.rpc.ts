import { injectable, inject } from 'inversify'
import { IRPCMethod } from '../../../../../core/rpc/rpc.types'
import { RPCMethodGraphCache } from '../graph-cache.types'
import { SIGNAL_SYMBOL } from '../../signal.types'
import { IGraphCacheService } from '../graph-cache.interface'

@injectable()
export class UpdateSignalRPCMethod implements IRPCMethod {

    public constructor(
        @inject(SIGNAL_SYMBOL.GraphCacheService)
        private graphCacheService: IGraphCacheService
    ) {}

    public name(): string {
        return RPCMethodGraphCache.updateSignal
    }

    public async handler(signalId: number): Promise<void> {
        await this.graphCacheService.updateSignal(signalId)
    }

}
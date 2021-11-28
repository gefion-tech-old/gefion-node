import { injectable, inject } from 'inversify'
import { IRPCMethod } from '../../../../../core/rpc/rpc.types'
import { RPCMethodGraphCache } from '../graph-cache.types'
import { SIGNAL_SYMBOL } from '../../signal.type'
import { IGraphCacheService } from '../graph-cache.interface'

@injectable()
export class UpdateSignalsRPCMethod implements IRPCMethod {

    public constructor(
        @inject(SIGNAL_SYMBOL.GraphCacheService)
        private graphCacheService: IGraphCacheService
    ) {}

    public name(): string {
        return RPCMethodGraphCache.updateSignals
    }

    public async handler(): Promise<void> {
        await this.graphCacheService.updateSignals()
    }

}
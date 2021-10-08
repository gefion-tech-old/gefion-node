import { injectable, inject } from 'inversify'
import { RepairJob } from '../../repair/repair.types'
import { RPC_SYMBOL } from '../rpc.types'
import { IStoreService } from './store.interface'

/**
 * Синхронизировать периодически информацию на случай, если какой-то экземпляр приложения
 * был исключён из пула серверов по временной причине, а после заработал, но не используется.
 * 
 * Так как задание будет запускаться на всех экземплярах, то нет необходимости посылать сигналы
 * синхронизации на другие экземпляры
 */
@injectable()
export class StoreRepair implements RepairJob {

    public constructor(
        @inject(RPC_SYMBOL.RPCStoreService)
        private storeService: IStoreService
    ) {}

    public name(): string {
        return 'RPC:StoreRepair'
    }

    public async test(): Promise<boolean> {
        return true
    }

    public async repair(): Promise<void> {
        await this.storeService.sync()
    }

}
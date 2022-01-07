import { injectable, inject } from 'inversify'
import { InitRunner } from '../../../../core/init/init.types'
import { IGraphCacheService } from './graph-cache.interface'
import { SIGNAL_SYMBOL } from '../signal.types'
import { ISignalService } from '../signal.interface'
import { SignalUpdateAndSyncError } from './graph-cache.error'
import { getAppLogger } from '../../../../utils/logger'
import { getLoggerErrorFormat } from '../../../../utils/error-format'

/**
 * Запускать полное обновление кэша графа сигналов с полной синхронизацией при
 * запуске нового экземпляра приложения, а также привязывать обновление кэша 
 * к событиям обновления сигнала
 */ 
@injectable()
export class InitGraphCache implements InitRunner {
 
    public constructor(
        @inject(SIGNAL_SYMBOL.GraphCacheService)
        private graphCacheService: IGraphCacheService,

        @inject(SIGNAL_SYMBOL.SignalService)
        private signalService: ISignalService
    ) {}
 
    public async run(): Promise<void> {
        await this.graphCacheService.updateSignalsAndSync()

        this.signalService.onSignalMutation((context) => {
            this.graphCacheService.updateSignalAndSync(context.signalId)
                .catch(reason => {
                    getAppLogger().error(getLoggerErrorFormat(new SignalUpdateAndSyncError(reason)), 'SignalUpdateAndSyncError')
                })
        })
    }
 
}
import { injectable, inject } from 'inversify'
import { InitRunner } from '../../../../core/init/init.types'
import { IGraphCacheService } from './graph-cache.interface'
import { SIGNAL_SYMBOL } from '../signal.type'

/**
 * Запускать полное обновление кэша графа сигналов с полной синхронизацией при
 * запуске нового экземпляра приложения
 */ 
@injectable()
export class InitGraphCache implements InitRunner {
 
    public constructor(
        @inject(SIGNAL_SYMBOL.GraphCacheService)
        private graphCacheService: IGraphCacheService
    ) {}
 
    public async run(): Promise<void> {
        await this.graphCacheService.updateSignalsAndSync()
    }
 
}
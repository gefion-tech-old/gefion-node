import { injectable } from 'inversify'
import { IGraphCacheService } from '../graph-cache/graph-cache.interface'
import { Signal } from '../../entities/signal.entity'

export function getGraphCacheService(mock: IGraphCacheService): new() => IGraphCacheService {
    @injectable()
    class GraphCacheService implements IGraphCacheService {

        signalDirection(signalId: number, callback: (signal: Signal) => Promise<boolean>): Promise<boolean> {
            return mock.signalDirection(signalId, callback)
        }

        updateSignal(signalId: number): Promise<void> {
            return mock.updateSignal(signalId)
        }
    
        updateSignals(): Promise<void> {
            return mock.updateSignals()
        }
    
        updateSignalAndSync(signalId: number): Promise<void> {
            return mock.updateSignalAndSync(signalId)
        }
    
        updateSignalsAndSync(): Promise<void> {
            return mock.updateSignalsAndSync()
        }

    }

    return GraphCacheService
}
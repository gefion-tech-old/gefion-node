import { Signal } from '../../entities/signal.entity'

export const RPCMethodGraphCache = {
    updateSignal: 'SignalModule:GraphCacheService:updateSignal',
    updateSignals: 'SignalModule:GraphCacheService:updateSignals'
}

export const UpdateCacheOperation = 'SignalModule:GraphCacheService:UpdateCache'

export type SignalId = number

/**
 * Кеш рёбер сигнала стандартного направления от выходного сигнала к входному сигналу
 */
export type SignalEdgesCache = Map<SignalId, SignalId[]>

/**
 * Кеш рёбер сигнала противоположного направления от входного сигнала к выходному сигналу
 */
export type SignalOppositeEdgesCache = Map<SignalId, SignalId[]>

/**
 * Список сущностей сигналов, сохранённых в кеше
 */
export type SignalCache = Map<SignalId, Signal>
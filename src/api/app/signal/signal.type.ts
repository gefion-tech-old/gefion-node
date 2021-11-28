import { BindableCreator } from '../creator/creator.types'

export const SIGNAL_SYMBOL = {
    SignalEntity: Symbol('SignalEntity'),
    SignalValidatorMethodEntity: Symbol('SignalValidatorMethodEntity'),
    SignalGuardMethodEntity: Symbol('SignalGuardMethodEntity'),
    SignalFilterMethodEntity: Symbol('SignalFilterMethodEntity'),
    SignalGraphEntity: Symbol('SignalGraphEntity'),
    SignalService: Symbol('SignalService'),
    GraphCacheService: Symbol('GraphCacheService'),
    GraphCacheUpdateSignalRPC: Symbol('GraphCacheUpdateSignalRPC'),
    GraphCacheUpdateSignalsRPC: Symbol('GraphCacheUpdateSignalsRPC'),
    GraphCacheInit: Symbol('GraphCacheInit')
}

export interface Signal {
    /**
     * Пространство имён сигнала
     */
    readonly namespace: string
    /**
     * Название сигнала
     */
    readonly name: string
}

export interface SignalMetadata {
    /**
     * Метаданные, которые сохраняются при создании сигнала
     */
    default: any
    /**
     * Метаданные, которые можно изменить в любой момент времени
     */
    custom: any
}

export interface CreateSignal {
    /**
     * Сигнал, который следует создать
     */
    signal: Signal
    /**
     * Дефолтные метаданные сигнала
     */
    defaultMetadata: any
    /**
     * Создатель сигнала
     */
    creator: BindableCreator
}
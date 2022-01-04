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

/**
 * Идентификатор события мутации
 */
export const SignalEventMutationName = Symbol('SignalMutationEvent')

export enum SignalEventMutation {
    /**
     * Событие создания сигнала
     */
    Create = 'Create',
    /**
     * Событие установки кастомных метаданных сигнала
     */
    SetCustomMetadata = 'SetCustomMetadata',
    /**
     * Событие добавление валидатора
     */
    AddValidator = 'AddValidator',
    /**
     * Событие удаления валидатора
     */
    RemoveValidator = 'RemoveValidator',
    /**
     * Событие добавление охранника
     */
    AddGuard = 'AddGuard',
    /**
     * Событие удаления охранника
     */
    RemoveGuard = 'RemoveGuard',
    /**
     * Событие добавления фильтра
     */
    AddFilter = 'AddFilter',
    /**
     * Событие удаления фильтра
     */
    RemoveFilter = 'RemoveFilter',
    /**
     * Событие присоединения сигнала к другому сигналу
     */
    Connect = 'Connect',
    /**
     * Событие отсоединения сигнала от другого сигнала
     */
    Unconnect = 'Unconnect',
    /**
     * Событие удаления сигнала
     */
    Remove = 'Remove'
}

export interface EventContext {
    /**
     * Тип мутации
     */
    type: SignalEventMutation
    /**
     * Идентификатор сигнала над которым происходит мутация
     */
    signalId: number
}
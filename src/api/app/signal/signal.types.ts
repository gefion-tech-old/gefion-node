import { BindableCreator } from '../creator/creator.types'

export const SIGNAL_SYMBOL = {
    SignalEntity: Symbol('SignalEntity'),
    SignalValidatorEntity: Symbol('SignalValidatorEntity'),
    SignalGuardEntity: Symbol('SignalGuardEntity'),
    SignalFilterEntity: Symbol('SignalFilterEntity'),
    SignalGraphEntity: Symbol('SignalGraphEntity'),
    SignalService: Symbol('SignalService'),
    GraphCacheService: Symbol('GraphCacheService'),
    GraphCacheUpdateSignalRPC: Symbol('GraphCacheUpdateSignalRPC'),
    GraphCacheUpdateSignalsRPC: Symbol('GraphCacheUpdateSignalsRPC'),
    GraphCacheInit: Symbol('GraphCacheInit'),
    GuardEntity: Symbol('GuardEntity'),
    GuardService: Symbol('GuardService'),
    FilterEntity: Symbol('FilterEntity'),
    FilterService: Symbol('FilterService'),
    ValidatorEntity: Symbol('ValidatorEntity'),
    ValidatorService: Symbol('ValidatorService')
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

export interface SignalValidatorMetadata {
    /**
     * Метаданные, которые можно изменить в любой момент времени без особых ограничений
     */
    custom: any
}

export interface SignalFilterMetadata {
    /**
     * Метаданные, которые можно изменить в любой момент времени без особых ограничений
     */
    custom: any
}

export interface SignalGuardMetadata {
    /**
     * Метаданные, которые можно изменить в любой момент времени без особых ограничений
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
     * Событие изменения метаданных связи сигнала с валидатором
     */
    SetSignalValidatorMetadata = 'SetSignalValidatorMetadata',
    /**
     * Событие удаления валидатора
     */
    RemoveValidator = 'RemoveValidator',
    /**
     * Событие добавление охранника
     */
    AddGuard = 'AddGuard',
    /**
     * Событие изменения метаданных связи сигнала с охранником
     */
    SetSignalGuardMetadata = 'SetSignalGuardMetadata',
    /**
     * Событие удаления охранника
     */
    RemoveGuard = 'RemoveGuard',
    /**
     * Событие добавления фильтра
     */
    AddFilter = 'AddFilter',
    /**
     * Событие изменения метаданных связи сигнала с фильтром
     */
    SetSignalFilterMetadata = 'SetSignalFilterMetadata',
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

export interface ValidatorEventContext {
    type: (
        SignalEventMutation.AddValidator
        | SignalEventMutation.RemoveValidator
        | SignalEventMutation.SetSignalValidatorMetadata
    ),
    signalId: number
    validatorId: number
}

export interface FilterEventContext {
    type: (
        SignalEventMutation.AddFilter
        | SignalEventMutation.RemoveFilter
        | SignalEventMutation.SetSignalFilterMetadata
    )
    signalId: number
    filterId: number
}

export interface GuardEventContext {
    type: (
        SignalEventMutation.AddGuard
        | SignalEventMutation.RemoveGuard
        | SignalEventMutation.SetSignalGuardMetadata
    ),
    signalId: number
    guardId: number
}

export interface GraphSignalEventContext {
    type: (
        SignalEventMutation.Connect
        | SignalEventMutation.Unconnect
    ),
    signalId: number,
    intoSignalId: number
}

export interface SignalEventContext {
    type: Exclude<SignalEventMutation, (
        GuardEventContext['type'] 
        | FilterEventContext['type']
        | ValidatorEventContext['type']
        | GraphSignalEventContext['type']
    )>
    signalId: number
}

export type EventContext = (
    SignalEventContext 
    | GuardEventContext 
    | FilterEventContext 
    | ValidatorEventContext
    | GraphSignalEventContext
)
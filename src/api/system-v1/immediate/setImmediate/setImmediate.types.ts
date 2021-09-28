import {
    SetImmediateErrorStatsSegment,
    SetImmediateAddActiveImmediatesStatsSegment,
    SetImmediateRemoveActiveImmediatesStatsSegment
} from './setImmediate.classes'

export const SetImmediateName = 'setImmediate'

export type SetImmediateStatsType = {
    /**
     * Количество активных immediate
     */
    immediate: number

    /**
     * Количество ошибок
     */
    error: number
}

export type ActiveImmediatesStatsSegment = {
    readonly immediate: 1 | -1
}

export type ErrorStatsSegment = {
    readonly error: 1 | -1
}

export type SetImmediateSegment = (
    SetImmediateErrorStatsSegment
    | SetImmediateAddActiveImmediatesStatsSegment
    | SetImmediateRemoveActiveImmediatesStatsSegment
)
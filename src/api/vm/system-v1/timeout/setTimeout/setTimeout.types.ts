import {
    SetTimeoutErrorStatsSegment,
    SetTimeoutAddActiveTimersStatsSegment,
    SetTimeoutRemoveActiveTimersStatsSegment
} from './setTimeout.classes'

export const SetTimeoutName = 'setTimeout'

export type SetTimeoutStatsType = {
    /**
     * Количество активных таймеров
     */
    timer: number

    /**
     * Количество ошибок
     */
    error: number
}

export type ActiveTimersStatsSegment = {
    readonly timer: 1 | -1
}

export type ErrorStatsSegment = {
    readonly error: 1 | -1
}

export type SetTimeoutSegment = (
    SetTimeoutErrorStatsSegment
    | SetTimeoutAddActiveTimersStatsSegment
    | SetTimeoutRemoveActiveTimersStatsSegment
)
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
    timer: 1 | -1
}

export type ErrorStatsSegment = {
    error: 1 | -1
}

export type SetTimeoutSegment = (
    SetTimeoutErrorStatsSegment
    | SetTimeoutAddActiveTimersStatsSegment
    | SetTimeoutRemoveActiveTimersStatsSegment
)
import {
    SetIntervalErrorStatsSegment,
    SetIntervalAddActiveIntervalsStatsSegment,
    SetIntervalRemoveActiveIntervalsStatsSegment
} from './setInterval.classes'

export const SetIntervalName = 'setInterval'

export type SetIntervalStatsType = {
    /**
     * Количество активных интервалов
     */
    interval: number

    /**
     * Количество ошибок
     */
    error: number
}

export type ActiveIntervalsStatsSegment = {
    readonly interval: 1 | -1
}

export type ErrorStatsSegment = {
    readonly error: 1 | -1
}

export type SetIntervalSegment = (
    SetIntervalErrorStatsSegment
    | SetIntervalAddActiveIntervalsStatsSegment
    | SetIntervalRemoveActiveIntervalsStatsSegment
)
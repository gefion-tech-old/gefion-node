import {
    PromiseAddOnFulfilledStatsSegment,
    PromiseAddOnRejectedStatsSegment,
    PromiseErrorStatsSegment,
    PromiseRemoveOnFulfilledStatsSegment,
    PromiseRemoveOnRejectedStatsSegment
} from './promise.classes'

export const PromiseName = 'Promise'

export type PromiseSegment = (
    PromiseAddOnFulfilledStatsSegment
    | PromiseAddOnRejectedStatsSegment
    | PromiseErrorStatsSegment
    | PromiseRemoveOnFulfilledStatsSegment
    | PromiseRemoveOnRejectedStatsSegment
)

export type ErrorStatsSegment = {
    /**
     * Сколько ошибок прибавить к общей статистике
     */
    error: 1
}

export type OnFulfilledStatsSegment = {
    /**
     * Сколько обработчиков успешного срабатывания промиса прибавить или убавить 
     * от общей статистики
     */
    onfulfilled: 1 | -1
}

export type OnRejectedStatsSegment = {
    /**
     * Сколько обработчиков ошибки в промисе прибавить или убавить от общей
     * статистики
     */
    onrejected: 1 | -1
}

/**
 * Тип итоговой общей статистики, которая будет вычисляться из сегментов
 */
export type PromiseStatsType = {
    /**
     * Количество ошибок
     */
    error: number

    /**
     * Количество обработчиков успешного срабатывания промиса
     */
    onfulfilled: number

    /**
     * Количество обработчиков ошибок промиса
     */
    onrejected: number
}
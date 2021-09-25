import { 
    APIPropertyStats
} from '../../../core/vm/api-property/api-property.classes'
import { 
    PromiseSegment,
    PromiseStatsType 
} from './promise.types'
import {
    PromiseAddOnFulfilledStatsSegment,
    PromiseAddOnRejectedStatsSegment,
    PromiseErrorStatsSegment,
    PromiseRemoveOnFulfilledStatsSegment,
    PromiseRemoveOnRejectedStatsSegment
} from './promise.classes'

export class PromiseStats extends APIPropertyStats {

    private __stats: PromiseStatsType = {
        error: 0,
        onfulfilled: 0,
        onrejected: 0
    }

    public stats(): PromiseStatsType {
        return this.__stats
    }

    public addStatsSegment(segment: PromiseSegment): void {
        if (
            segment instanceof PromiseAddOnFulfilledStatsSegment
            || segment instanceof PromiseRemoveOnFulfilledStatsSegment
        ) {
            this.__stats.onfulfilled += segment.rawSegment().onfulfilled
        }

        if (
            segment instanceof PromiseAddOnRejectedStatsSegment
            || segment instanceof PromiseRemoveOnRejectedStatsSegment
        ) {
            this.__stats.onrejected += segment.rawSegment().onrejected
        }

        if (segment instanceof PromiseErrorStatsSegment) {
            this.__stats.error += segment.rawSegment().error
        }
    }

}
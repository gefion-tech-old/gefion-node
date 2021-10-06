import { 
    APIPropertyStats
} from '../../../../../core/vm/api-property/api-property.classes'
import {
    SetIntervalErrorStatsSegment,
    SetIntervalAddActiveIntervalsStatsSegment,
    SetIntervalRemoveActiveIntervalsStatsSegment
} from './setInterval.classes'
import {
    SetIntervalStatsType,
    SetIntervalSegment
} from './setInterval.types'

export class SetIntervalStats extends APIPropertyStats {

    private __stats: SetIntervalStatsType = {
        error: 0,
        interval: 0
    }

    public stats(): SetIntervalStatsType {
        return this.__stats
    }

    public addStatsSegment(segment: SetIntervalSegment): void {
        if (
            segment instanceof SetIntervalAddActiveIntervalsStatsSegment
            || segment instanceof SetIntervalRemoveActiveIntervalsStatsSegment
        ) {
            this.__stats.interval += segment.rawSegment().interval
        }

        if (segment instanceof SetIntervalErrorStatsSegment) {
            this.__stats.error += segment.rawSegment().error
        }
    }

}
import { 
    APIPropertyStats
} from '../../../../../core/vm/api-property/api-property.classes'
import {
    SetTimeoutErrorStatsSegment,
    SetTimeoutAddActiveTimersStatsSegment,
    SetTimeoutRemoveActiveTimersStatsSegment
} from './setTimeout.classes'
import {
    SetTimeoutStatsType,
    SetTimeoutSegment
} from './setTimeout.types'

export class SetTimeoutStats extends APIPropertyStats {

    private __stats: SetTimeoutStatsType = {
        error: 0,
        timer: 0
    }

    public stats(): SetTimeoutStatsType {
        return this.__stats
    }

    public addStatsSegment(segment: SetTimeoutSegment): void {
        if (
            segment instanceof SetTimeoutAddActiveTimersStatsSegment
            || segment instanceof SetTimeoutRemoveActiveTimersStatsSegment
        ) {
            this.__stats.timer += segment.rawSegment().timer
        }

        if (segment instanceof SetTimeoutErrorStatsSegment) {
            this.__stats.error += segment.rawSegment().error
        }
    }

}
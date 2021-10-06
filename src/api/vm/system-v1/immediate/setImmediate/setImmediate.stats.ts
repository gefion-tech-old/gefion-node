import { 
    APIPropertyStats
} from '../../../../../core/vm/api-property/api-property.classes'
import {
    SetImmediateErrorStatsSegment,
    SetImmediateAddActiveImmediatesStatsSegment,
    SetImmediateRemoveActiveImmediatesStatsSegment
} from './setImmediate.classes'
import {
    SetImmediateStatsType,
    SetImmediateSegment
} from './setImmediate.types'

export class SetImmediateStats extends APIPropertyStats {

    private __stats: SetImmediateStatsType = {
        error: 0,
        immediate: 0
    }

    public stats(): SetImmediateStatsType {
        return this.__stats
    }

    public addStatsSegment(segment: SetImmediateSegment): void {
        if (
            segment instanceof SetImmediateAddActiveImmediatesStatsSegment
            || segment instanceof SetImmediateRemoveActiveImmediatesStatsSegment
        ) {
            this.__stats.immediate += segment.rawSegment().immediate
        }

        if (segment instanceof SetImmediateErrorStatsSegment) {
            this.__stats.error += segment.rawSegment().error
        }
    }

}
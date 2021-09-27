import { 
    APIPropertyStatsSegment 
} from '../../../../core/vm/api-property/api-property.classes'
import {
    ErrorStatsSegment,
    ActiveIntervalsStatsSegment
} from './setInterval.types'

/**
 * Подсчёт ошибок
 */
export class SetIntervalErrorStatsSegment extends APIPropertyStatsSegment {

    public constructor() {
        const segment: ErrorStatsSegment = {
            error: 1
        }

        super(() => segment)
    }

    public rawSegment(): ErrorStatsSegment {
        return super.rawSegment()
    }

}

/**
 * Подсчёт интервалов
 */
export class SetIntervalAddActiveIntervalsStatsSegment extends APIPropertyStatsSegment {

    public constructor() {
        const segment: ActiveIntervalsStatsSegment = {
            interval: 1
        }

        super(() => segment)
    }

    public rawSegment(): ActiveIntervalsStatsSegment {
        return super.rawSegment()
    }

}
export class SetIntervalRemoveActiveIntervalsStatsSegment extends APIPropertyStatsSegment {

    public constructor() {
        const segment: ActiveIntervalsStatsSegment = {
            interval: -1
        }

        super(() => segment)
    }

    public rawSegment(): ActiveIntervalsStatsSegment {
        return super.rawSegment()
    }

}
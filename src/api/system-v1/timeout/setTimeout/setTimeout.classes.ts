import { 
    APIPropertyStatsSegment 
} from '../../../../core/vm/api-property/api-property.classes'
import {
    ErrorStatsSegment,
    ActiveTimersStatsSegment
} from './setTimeout.types'

/**
 * Подсчёт ошибок
 */
export class SetTimeoutErrorStatsSegment extends APIPropertyStatsSegment {

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
 * Подсчёт таймеров
 */
export class SetTimeoutAddActiveTimersStatsSegment extends APIPropertyStatsSegment {

    public constructor() {
        const segment: ActiveTimersStatsSegment = {
            timer: 1
        }

        super(() => segment)
    }

    public rawSegment(): ActiveTimersStatsSegment {
        return super.rawSegment()
    }

}
export class SetTimeoutRemoveActiveTimersStatsSegment extends APIPropertyStatsSegment {

    public constructor() {
        const segment: ActiveTimersStatsSegment = {
            timer: -1
        }

        super(() => segment)
    }

    public rawSegment(): ActiveTimersStatsSegment {
        return super.rawSegment()
    }

}
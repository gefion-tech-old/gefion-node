import { 
    APIPropertyStatsSegment 
} from '../../../../../core/vm/api-property/api-property.classes'
import {
    ErrorStatsSegment,
    ActiveImmediatesStatsSegment
} from './setImmediate.types'

/**
 * Подсчёт ошибок
 */
export class SetImmediateErrorStatsSegment extends APIPropertyStatsSegment {

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
 * Подсчёт immediates
 */
export class SetImmediateAddActiveImmediatesStatsSegment extends APIPropertyStatsSegment {

    public constructor() {
        const segment: ActiveImmediatesStatsSegment = {
            immediate: 1
        }

        super(() => segment)
    }

    public rawSegment(): ActiveImmediatesStatsSegment {
        return super.rawSegment()
    }

}
export class SetImmediateRemoveActiveImmediatesStatsSegment extends APIPropertyStatsSegment {

    public constructor() {
        const segment: ActiveImmediatesStatsSegment = {
            immediate: -1
        }

        super(() => segment)
    }

    public rawSegment(): ActiveImmediatesStatsSegment {
        return super.rawSegment()
    }

}
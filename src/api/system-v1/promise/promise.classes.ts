import { APIPropertyStatsSegment } from '../../../core/vm/api-property/api-property.classes'
import { 
    ErrorStatsSegment,
    OnFulfilledStatsSegment,
    OnRejectedStatsSegment
} from './promise.types'

export abstract class VMPromise<T> extends Promise<T> {

    abstract callUnhandledRejection(reason: any): void

}



/**
 * Подсчёт ошибок
 */
export class PromiseErrorStatsSegment extends APIPropertyStatsSegment {

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
 * Подсчет зарегистрированных обработчиков успешного срабатывания промиса
 */
export class PromiseAddOnFulfilledStatsSegment extends APIPropertyStatsSegment {

    public constructor() {
        const segment: OnFulfilledStatsSegment = {
            onfulfilled: 1
        }

        super(() => segment)
    }

    public rawSegment(): OnFulfilledStatsSegment {
        return super.rawSegment()
    }

}
export class PromiseRemoveOnFulfilledStatsSegment extends APIPropertyStatsSegment {

    public constructor() {
        const segment: OnFulfilledStatsSegment = {
            onfulfilled: -1
        }

        super(() => segment)
    }

    public rawSegment(): OnFulfilledStatsSegment {
        return super.rawSegment()
    }

}

/**
 * Подсчёт зарегистрированных обработчиков ошибок в промисах
 */
export class PromiseAddOnRejectedStatsSegment extends APIPropertyStatsSegment {

    public constructor() {
        const segment: OnRejectedStatsSegment = {
            onrejected: 1
        }

        super(() => segment)
    }

    public rawSegment(): OnRejectedStatsSegment {
        return super.rawSegment()
    }

}
export class PromiseRemoveOnRejectedStatsSegment extends APIPropertyStatsSegment {

    public constructor() {
        const segment: OnRejectedStatsSegment = {
            onrejected: -1
        }

        super(() => segment)
    }

    public rawSegment(): OnRejectedStatsSegment {
        return super.rawSegment()
    }

}
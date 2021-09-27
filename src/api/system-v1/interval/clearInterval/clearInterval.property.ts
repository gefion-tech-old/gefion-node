import {
    APIProperty
} from '../../../../core/vm/api-property/api-property.classes'
import { clearIntervalEvent } from './clearInterval.event'

export class ClearIntervalAPIProperty extends APIProperty {

    public async init(scriptId: symbol): Promise<any> {
        return (intervalId: symbol): void => {
            /**
             * Вызываю событие ClearInterval для того, чтобы setInterval свойство
             * смогло корректным образом на него среагировать. Очищать интервал также
             * нужно будет через событие в свойстве setInterval
             */
            clearIntervalEvent.emit({
                scriptId,
                intervalId
            })
        }
    }

    public hasLink(): boolean {
        return false
    }

}
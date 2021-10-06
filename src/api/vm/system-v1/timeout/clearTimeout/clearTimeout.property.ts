import {
    APIProperty
} from '../../../../../core/vm/api-property/api-property.classes'
import { clearTimeoutEvent } from './clearTimeout.event'

export class ClearTimeoutAPIProperty extends APIProperty {

    public async init(scriptId: symbol): Promise<any> {
        return (timeoutId: symbol): void => {
            /**
             * Вызываю событие ClearTimeout для того, чтобы setTimeout свойство
             * смогло корректным образом на него среагировать. Очищать таймер также
             * нужно будет через событие в свойстве setTimeout
             */
            clearTimeoutEvent.emit({
                scriptId,
                timeoutId
            })
        }
    }

    public hasLink(): boolean {
        return false
    }

}
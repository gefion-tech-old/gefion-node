import {
    APIProperty
} from '../../../../../core/vm/api-property/api-property.classes'
import { clearImmediateEvent } from './clearImmediate.event'

export class ClearImmediateAPIProperty extends APIProperty {

    public async init(scriptId: symbol): Promise<any> {
        return (immediateId: symbol): void => {
            /**
             * Вызываю событие ClearImmediate для того, чтобы setImmediate свойство
             * смогло корректным образом на него среагировать. Очищать immediate также
             * нужно будет через событие в свойстве setImmediate
             */
            clearImmediateEvent.emit({
                scriptId,
                immediateId
            })
        }
    }

    public hasLink(): boolean {
        return false
    }

}
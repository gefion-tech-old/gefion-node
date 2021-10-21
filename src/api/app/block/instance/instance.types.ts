import { 
    ClearImmediateName
} from '../../../vm/system-v1/immediate/clearImmediate/clearImmediate.types'
import {
    SetImmediateName
} from '../../../vm/system-v1/immediate/setImmediate/setImmediate.types'
import {
    ClearIntervalName
} from '../../../vm/system-v1/interval/clearInterval/clearInterval.types'
import {
    SetIntervalName
} from '../../../vm/system-v1/interval/setInterval/setInterval.types'
import {
    PromiseName
} from '../../../vm/system-v1/promise/promise.types'
import {
    ClearTimeoutName
} from '../../../vm/system-v1/timeout/clearTimeout/clearTimeout.types'
import {
    SetTimeoutName
} from '../../../vm/system-v1/timeout/setTimeout/setTimeout.types'

export type InstanceId = number

export const BlockInstanceAPIProperties = [
    ClearImmediateName,
    SetImmediateName,
    ClearIntervalName,
    SetIntervalName,
    PromiseName,
    ClearTimeoutName,
    SetTimeoutName
]

export const RPCMethodsInstanceService = {
    start: 'BlockModule:InstanceService:start',
    restart: 'BlockModule:InstanceService:restart',
    remove: 'BlockModule:InstanceService:remove'
}
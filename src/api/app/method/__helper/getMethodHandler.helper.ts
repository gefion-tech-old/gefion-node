import { MethodHandler, MethodHandlerBase } from '../method.types'
import { ScriptID } from '../../../../core/vm/vm.types'

export function getMethodHandler(handler: MethodHandlerBase, scriptId: ScriptID): MethodHandler {
    const methodHandler: any = handler as any
    methodHandler.scriptId = scriptId
    return methodHandler
}
import { injectable } from 'inversify'
import { IVMService } from '../vm.interface'
import {
    ScriptRun,
    ScriptID,
    ScriptInfo,
    ReadyAPIPropertyStats,
    ScriptActivityInfo
} from '../vm.types'
import { ScriptError } from '../vm.errors'

export function getVMService(mock: {
    run: (params: ScriptRun) => Promise<ScriptID>
    listScripts: () => ScriptID[]
    remove: (scriptId: ScriptID) => void
    info: (scriptId: ScriptID) => ScriptInfo | undefined
    stats(scriptId: ScriptID): Promise<ReadyAPIPropertyStats[] | undefined>

    on(scriptId: ScriptID, event: symbol, handler: (error: ScriptError) => void): void
    on(scriptId: ScriptID, event: symbol, handler: (info: ScriptActivityInfo) => void): void
    on(scriptId: ScriptID, event: symbol, handler: () => void): void

    error(scriptId: ScriptID, error: any): void
}): new() => IVMService {
    @injectable()
    class VMService implements IVMService {

        public async run(params: ScriptRun): Promise<ScriptID> {
            return await mock.run(params)
        }

        public listScripts(): ScriptID[] {
            return mock.listScripts()
        }

        public remove(scriptId: ScriptID): void {
            mock.remove(scriptId)
        }

        public info(scriptId: ScriptID): ScriptInfo | undefined {
            return mock.info(scriptId)
        }

        public async stats(scriptId: ScriptID): Promise<ReadyAPIPropertyStats[] | undefined> {
            return await mock.stats(scriptId)
        }

        public on(scriptId: ScriptID, event: symbol, handler: any): void {
            mock.on(scriptId, event, handler)
        }

        public error(scriptId: ScriptID, error: any): void {
            mock.error(scriptId, error)
        }

    }

    return VMService
}
import { injectable } from 'inversify'
import { IScriptStarterService } from '../script-starter/script-starter.interface'
import { FileRunOptions } from '../script-starter/script-starter.types'

export function getScriptStarterService(mock: {
    runFile: (options: FileRunOptions) => void
}): new() => IScriptStarterService {
    @injectable()
    class ScriptStartService implements IScriptStarterService {
    
        runFile(options: FileRunOptions): void {
            mock.runFile(options)
        }
    
    }

    return ScriptStartService
}

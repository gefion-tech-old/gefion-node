import { injectable } from 'inversify'
import { IScriptStarterService } from './script-starter.interface'
import { FileRunOptions } from './script-starter.types'
import { NodeVM } from 'vm2'

@injectable()
export class ScriptStarterService implements IScriptStarterService {

    runFile(options: FileRunOptions): void {
        const vm = new NodeVM({
            console: 'off',
            sandbox: options.sandbox,
            require: {
                external: true,
                root: options.rootDir
            }
        })
        vm.runFile(options.filename)
    }

}
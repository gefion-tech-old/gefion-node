import { ScriptID } from './vm.types'

export class VMError extends Error {}

export class ScriptError extends VMError {

    public name = 'ScriptError'
    public message = 'В запущенном скрипте виртуальной машины произошла ошибка'

    public constructor(
        public scriptId: ScriptID, 
        public error: any
    ) {
        super()
    }

}
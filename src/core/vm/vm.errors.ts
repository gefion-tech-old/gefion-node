import { ScriptID } from './vm.types'

export class VMError extends Error {}

export class ScriptError extends VMError {

    public constructor(
        public scriptId: ScriptID, 
        public error: any
    ) {
        super()
    }

}
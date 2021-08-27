import { ScriptID } from './vm.types'

export class ScriptError extends Error {

    public constructor(
        public scriptId: ScriptID, 
        public error: Error
    ) {
        super()
    }

}
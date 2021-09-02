import { VMError } from '../vm.errors'
import { TargetApiProperty } from './api-property.types'

export class APIPropertyError extends VMError {

    public constructor(
        public targetApiProperty: TargetApiProperty,
        public error: any
    ) {
        super()
    }

}
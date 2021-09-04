import { VMError } from '../vm.errors'
import { TargetApiProperty } from './api-property.types'

export class APIPropertyError extends VMError {

    public name = 'APIPropertyError'
    public message = 'В свойстве скрипта в виртуальной машине произошла ошибка'

    public constructor(
        public targetApiProperty: TargetApiProperty,
        public error: any
    ) {
        super()
    }

}
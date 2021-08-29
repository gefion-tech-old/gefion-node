import { TargetApiProperty } from './api-property.types'

export class APIPropertyError extends Error {

    public constructor(
        public targetApiProperty: TargetApiProperty,
        public error: Error
    ) {
        super()
    }

}
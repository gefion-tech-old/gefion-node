import { TargetApiProperty } from './api-property.types'

export class ApiPropertyError extends Error {

    public constructor(
        public targetApiProperty: TargetApiProperty,
        public error: Error
    ) {
        super()
    }

}
import { UserError } from '../user.errors'

export class PermissionError extends UserError {}

export class PermissionAlreadyExists extends PermissionError {

    public name = 'PermissionAlreadyExists'
    public message = 'Указанное полномочие уже существует'

}

export class PermissionDoesNotExist extends PermissionError {

    public name = 'PermissionDoesNotExist'
    public message = 'Указанного полномочия не существует'

}
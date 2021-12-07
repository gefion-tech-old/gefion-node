import { UserError } from '../user.errors'

export class PermissionError extends UserError {}

export class PermissionDoesNotExist extends PermissionError {

    public name = 'PermissionDoesNotExist'
    public message = 'Указанного полномочия не существует'

}
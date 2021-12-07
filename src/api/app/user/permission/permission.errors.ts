export class PermissionError extends Error {}

export class PermissionDoesNotExist extends PermissionError {

    public name = 'PermissionDoesNotExist'
    public message = 'Указанного полномочия не существует'

}
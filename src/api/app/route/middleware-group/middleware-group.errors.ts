export class MiddlewareGroupError extends Error {}

export class MiddlewareGroupDoesNotExists extends MiddlewareGroupError {

    public name = 'MiddlewareGroupDoesNotExists'
    public message = 'Указанной группы middleware не существует'

}
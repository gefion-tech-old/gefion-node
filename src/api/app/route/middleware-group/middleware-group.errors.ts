export class MiddlewareGroupError extends Error {}

export class MiddlewareGroupMiddlewareDoesNotExists extends MiddlewareGroupError {

    public name = 'MiddlewareGroupMiddlewareDoesNotExists'
    public message = 'Указанного middleware не существует'

}

export class MiddlewareGroupDoesNotExists extends MiddlewareGroupError {

    public name = 'MiddlewareGroupDoesNotExists'
    public message = 'Указанной группы middleware не существует'

}
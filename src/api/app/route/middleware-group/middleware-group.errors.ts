export class MiddlewareGroupError extends Error {}

export class MiddlewareGroupDoesNotExists extends MiddlewareGroupError {

    public name = 'MiddlewareGroupDoesNotExists'
    public message = 'Указанной группы middleware не существует'

}

export class MiddlewareGroupDoesNotHaveMiddleware extends MiddlewareGroupError {

    public name = 'MiddlewareGroupDoesNotHaveMiddleware'
    public message = 'Указанная группа middleware не имеет связи с указанным middleware'

}
export class MiddlewareGroupError extends Error {}

export class MiddlewareAlreadyBound extends MiddlewareGroupError {

    public name = 'MiddlewareAlreadyBound'
    public message = 'К указанной группе middleware уже привязан указанный middleware'

}

export class MiddlewareGroupAlreadyExists extends MiddlewareGroupError {

    public name = 'MiddlewareGroupAlreadyExists'
    public message = 'Указанная группа middleware уже существует'

}

export class MiddlewareGroupDoesNotExists extends MiddlewareGroupError {

    public name = 'MiddlewareGroupDoesNotExists'
    public message = 'Указанной группы middleware не существует'

}

export class MiddlewareGroupDoesNotHaveMiddleware extends MiddlewareGroupError {

    public name = 'MiddlewareGroupDoesNotHaveMiddleware'
    public message = 'Указанная группа middleware не имеет связи с указанным middleware'

}
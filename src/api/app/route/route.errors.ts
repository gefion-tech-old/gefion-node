export class RouteError extends Error {}

export class RouteAlreadyExists extends RouteError {

    public name = 'RouteAlreadyExists'
    public message = 'Указанный маршрут уже существует'

}

export class MiddlewareGroupAlreadyBound extends RouteError {

    public name = 'MiddlewareGroupAlreadyBound'
    public message = 'Указанная группа middleware уже привязана к указанному маршруту'

}

export class MiddlewareAlreadyBound extends RouteError {

    public name = 'MiddlewareAlreadyBound'
    public message = 'Указанный middleware уже привязан к указанному маршруту'

}

export class RoutePathAndMethodAlreadyExists extends RouteError {

    public name = 'RoutePathAndMethodAlreadyExists'
    public message = 'Маршрут с указанным путём и методом уже существует'

}

export class RouteDoesNotExists extends RouteError {

    public name = 'RouteDoesNotExists'
    public message = 'Указанного маршрута не существует'

}

export class RouteDoesNotHaveMiddleware extends RouteError {

    public name = 'RouteDoesNotHaveMiddleware'
    public message = 'Указанный маршрут не имеет связи с указанным middleware'

}

export class RouteDoesNotHaveMiddlewareGroup extends RouteError {

    public name = 'RouteDoesNotHaveMiddlewareGroup'
    public message = 'Указанный маршрут не имеет связи с указанной группой middleware'

}
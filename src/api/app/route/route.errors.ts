export class RouteError extends Error {}

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
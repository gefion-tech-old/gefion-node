export class MiddlewareError extends Error {}

export class MiddlewareMethodNotDefined extends MiddlewareError {

    public name = 'MiddlewareMethodNotDefined'
    public message = 'К middleware нельзя привязать несуществующий метод'

}

export class MiddlewareDoesNotExists extends MiddlewareError {

    public name = 'MiddlewareDoesNotExists'
    public message = 'Указанного middleware не существует'

}
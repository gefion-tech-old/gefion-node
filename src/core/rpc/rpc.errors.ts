export class RPCError extends Error {}

export class MethodDoesNotExistsError extends RPCError {

    public name = 'MethodDoesNotExistsError'
    public message: string

    public constructor(method: string) {
        super()
        this.message = 'Вызываемого метода ' + method + ' не существует'
    }

}

export class MoreThenOneHandlerError extends RPCError {

    public name = 'MoreThenOneHandlerError'
    public message: string

    public constructor(method: string) {
        super()
        this.message = 'У метода ' + method + ' уже объявлен обработчик'
    }

}

export class DifferentAppIdsError extends RPCError {

    public name = 'DifferentAppIdsError'
    public message = 'Попытка вызвать удаленный метод приложения с отличающимся идентификатором'

}

export class ErrorInMethod extends RPCError {

    public name = 'ErrorInMethod'
    public message = 'В обработчике метода rpc произошла неожиданная ошибка'

    public constructor(
        public error: any
    ) {
        super()
    }

}

export class UnexceptedRPCHandlerError extends RPCError {

    public name = 'UnexceptedRPCError'
    public message = 'Неожиданная ошибка при попытке вызывать обработчик rpc метода'

    public constructor(
        public error: any
    ) {
        super()
    }

}
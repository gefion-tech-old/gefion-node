export class HandlerIsNotFunction extends TypeError {

    public name = 'HandlerIsNotFunction'
    public message = 'Обработчик обязательно должен быть функцией'

}

export class SetTimeoutError extends Error {}

export class MissingIDOfTimeouts extends SetTimeoutError {

    public name = 'MissingIDOfTimeouts'
    public message = 'Отсутствует запрашиваемый идентификатор тайм-аута'

}
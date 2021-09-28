export class HandlerIsNotFunction extends TypeError {

    public name = 'HandlerIsNotFunction'
    public message = 'Обработчик обязательно должен быть функцией'

}

export class SetImmediateError extends Error {}

export class MissingIDOfImmediates extends SetImmediateError {

    public name = 'MissingIDOfImmediates'
    public message = 'Отсутствует запрашиваемый идентификатор immediate'

}
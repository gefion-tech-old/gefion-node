export class HandlerIsNotFunction extends TypeError {

    public name = 'HandlerIsNotFunction'
    public message = 'Обработчик обязательно должен быть функцией'

}

export class SetIntervalError extends Error {}

export class MissingIDOfIntervals extends SetIntervalError {

    public name = 'MissingIDOfIntervals'
    public message = 'Отсутствует запрашиваемый идентификатор интервала'

}
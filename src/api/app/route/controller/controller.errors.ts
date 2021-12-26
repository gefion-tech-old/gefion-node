export class ControllerError extends Error {}

export class ControllerMethodNotDefined extends ControllerError {

    public name = 'ControllerMethodNotDefined'
    public message = 'К контроллеру нельзя привязать несуществующий метод'

}

export class ControllerDoesNotExists extends ControllerError {

    public name = 'ControllerDoesNotExists'
    public message = 'Указанного контроллера не существует'

}
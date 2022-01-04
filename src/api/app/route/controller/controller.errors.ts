export class ControllerError extends Error {}

export class ControllerAlreadyExists extends ControllerError {

    public name = 'ControllerAlreadyExists'
    public message = 'Указанный контроллер уже существует'

}

export class ControllerUsedError extends ControllerError {

    public name = 'ControllerUsedError'
    public message = 'Указанный контроллер в настоящее время используется'

}

export class ControllerMethodNotDefined extends ControllerError {

    public name = 'ControllerMethodNotDefined'
    public message = 'К контроллеру нельзя привязать несуществующий метод'

}

export class ControllerDoesNotExists extends ControllerError {

    public name = 'ControllerDoesNotExists'
    public message = 'Указанного контроллера не существует'

}
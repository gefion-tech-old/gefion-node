import { Method } from './method.types'

export class MethodError extends Error {}

export class HandlerAlreadyAttached extends MethodError {

    public name = 'HandlerAlreadyAttached'
    public message = 'К данному методу уже прикреплён обработчик'

    public constructor(
        public method: Method
    ) {

        super()
    }

}

export class MethodNotAvailable extends MethodError {

    public name = 'MethodNotAvailable'
    public message = 'Вызываемый метод по какой-либо причине недоступен'

    public constructor(
        public method: Method
    ) {
        super()
    }

}

export class MethodUsedError extends MethodError {

    public name = 'MethodUsedError'
    public message = 'Попытка удалить метод, к которому привязаны важные ресурсы'

}

export class InvalidScriptID extends MethodError {

    public name = 'InvalidScriptID'
    public message = 'Недействительный идентификатор запущенного скрипта'

}

export class AccessIsDenied extends MethodError {

    public name = 'AccessIsDenied'
    public message = 'Попытка переопределить метод без прав владения на него'

}
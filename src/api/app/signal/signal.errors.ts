export class SignalError extends Error {}

export class SignalAlreadyExists extends SignalError {

    public name = 'SignalAlreadyExists'
    public message = 'Указанный сигнал уже существует'

}

export class SignalDoesNotExist extends SignalError {

    public name = 'SignalDoesNotExist'
    public message = 'Указанного сигнала не существует'

}

export class SignalMethodNotDefined extends SignalError {

    public name = 'SignalMethodNotDefined'
    public message = 'К сигналу нельзя привязать несуществующий метод'

}

export class ValidatorAlreadyBound extends SignalError {

    public name = 'ValidatorAlreadyBound'
    public message = 'Указанный метод валидатора уже привязан к данному сигналу'

}

export class GuardAlreadyBound extends SignalError {

    public name = 'GuardAlreadyBound'
    public message = 'Указанный метод охранника уже привязан к данному сигналу'

}

export class FilterAlreadyBound extends SignalError {

    public name = 'FilterAlreadyBound'
    public message = 'Указанный метод фильтра уже привязан к данному сигналу'
    
}

export class InputSignalDoesNotExist extends SignalError {

    public name = 'InputSignalDoesNotExist'
    public message = 'Указанного входного сигнала не существует'

}

export class OutputSignalDoesNotExist extends SignalError {

    public name = 'OutputSignalDoesNotExist'
    public message = 'Указанного выходного сигнала не существует'

}

export class CyclicSignalsNotAllowed extends SignalError {

    public name = 'CyclicSignalsNotAllowed'
    public message = 'Создание циклических сигналов запрещено'

}

export class SignalUsedError extends SignalError {

    public name = 'SignalUsedError'
    public message = 'Попытка удалить сигнал, к которому привязаны важные ресурсы'

}
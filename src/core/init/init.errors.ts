export class InitError extends Error {}

export class InitRunnerError extends InitError {

    public name = 'InitRunnerError'
    public message = 'Ошибка в одном из инициализированных модулей'

    public constructor(
        public error: any
    ) {
        super()
    }

}

export class ReInitError extends InitError {

    public name = 'ReInitError'
    public message = 'Попытка повторного запуска модуля инициализации'

}
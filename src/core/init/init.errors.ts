export class InitError extends Error {}

export class InitRunnerError extends InitError {

    public message = 'Ошибка в одном из инициализированных модулей'

    public constructor(
        public error: Error
    ) {
        super()
    }

}

export class ReInitError extends InitError {

    public message = 'Модуль инициализации не может быть повторно инициализирован'

}
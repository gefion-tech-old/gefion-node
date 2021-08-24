export const LOGGER_SYMBOL = {
    LoggerHttpConfig: Symbol('LoggerHttpConfig'),
    LoggerAppConfig: Symbol('LoggerAppConfig'),
    LoggerDatabaseConfig: Symbol('LoggerDatabaseConfig'),
    LoggerScheduleConfig: Symbol('LoggerScheduleConfig'),
    LoggerHttp: Symbol('LoggerHttp'),
    LoggerApp: Symbol('LoggerApp'),
    LoggerDatabase: Symbol('LoggerDatabase'),
    LoggerSchedule: Symbol('LoggerSchedule')
}

export type LoggerConfig = {
    // Имя регистратора. Будет добавляться к каждой строке. По умолчанию undefined
    readonly name?: string
    // Уровень ведения журнала.
    readonly level: 'fatal' | 'error' | 'warn' | 'info' | 'trace' | 'debug'
    // Объект, свойства которого статично будут добавляться ко всем записям.
    // По умолчанию {pid: process.pid, hostname: os.hostname}
    readonly base: { [key: string]: any }
    // Остановить или включить ведение журнала
    readonly enabled: boolean
    // Место, в которое будут уходить все логи (в синхронном режиме)
    // По умолчанию 1 (stdout)
    // - string - Путь файловой системы
    // - number - файловый дескриптор
    // - undefined - значение по умолчанию
    // - WritableStream - свое решение
    readonly destination?: string | number | NodeJS.WritableStream
}
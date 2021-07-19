import { Logger } from "pino"

export const LOGGER_SYMBOL = {
    LoggerHttpConfig: Symbol.for('LoggerHttpConfig'),
    LoggerAppConfig: Symbol.for('LoggerAppConfig'),
    LoggerHttp: Symbol.for('LoggerHttp'),
    LoggerApp: Symbol.for('LoggerApp')
}

export type LoggerType = Logger

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
    // - WritableStrem - свое решение
    readonly destination?: string | number | NodeJS.WritableStream
}
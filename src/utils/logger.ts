import pino from 'pino'
import os from 'os'

let appLogger: pino.Logger
let customLogger: pino.Logger

/**
 * Получить экземпляр логгера для приложения
 */
export function getAppLogger(): pino.Logger {
    if (!appLogger) {
        appLogger = pino({
            name: 'App',
            level: 'info',
            base: { pid: process.pid, hostname: os.hostname },
            enabled: process.env.NODE_ENV !== 'test'
        })
    }

    return appLogger
}

/**
 * Получить экземпляр пользовательского логгера
 */
export function getCustomLogger(): pino.Logger {
    if (!customLogger) {
        customLogger = pino({
            name: 'Custom',
            level: 'info',
            enabled: process.env.NODE_ENV !== 'test'
        })
    }

    return customLogger
}

/**
 * Получить экземпляр логгера для планировщика заданий
 */
export function getScheduleLogger(): pino.Logger {
    return getAppLogger().child({
        type: 'schedule'
    })
}

/**
 * Получить экземпляр логгера для http сервера
 */
export function getHttpLogger(): pino.Logger {
    return getAppLogger().child({
        type: 'http'
    })
}

/**
 * Получить экземпляр логгера для жалоб на методы
 */
export function getMethodIssueLogger(): pino.Logger {
    return getCustomLogger().child({
        type: 'method-issue'
    })
}
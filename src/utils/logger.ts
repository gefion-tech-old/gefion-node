import pino from 'pino'
import os from 'os'

let appLogger: pino.Logger

/**
 * Получить экземпляр логгера для всего приложения
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
 * Получить экземпляр логгера для планировщика заданий
 */
export function getScheduleLogger(): pino.Logger {
    return getAppLogger().child({
        type: 'schedule'
    })
}
import pino from 'pino'
import os from 'os'

let appLogger: pino.Logger

export function getAppLogger(): pino.Logger {
    if (!appLogger) {
        appLogger = pino({
            name: 'App',
            level: 'info',
            base: { pid: process.pid, hostname: os.hostname },
            enabled: true
        })
    }

    return appLogger
}

export function getScheduleLogger(): pino.Logger {
    return getAppLogger().child({
        type: 'schedule'
    })
}
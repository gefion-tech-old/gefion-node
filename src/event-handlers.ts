import { getLoggerErrorFormat } from './utils/error-format'
import { VMPromise } from './api/system-v1/promise/promise.classes'
import { getAppLogger } from './utils/logger'


export function uncaughtException(error: any): void {
    getAppLogger().fatal(getLoggerErrorFormat(error), 'uncaughtException')
    process.exit(1)
}

export function unhandledRejection(reason: any, promise: Promise<any>): void {
    /**
     * Запускать у промиса метод callUnhandledRejection, если это промис
     * виртуальной машины.
     * 
     * Подробности в: ./src/api/system-v1/promise/promise.property.ts
     */
    if (promise instanceof VMPromise) {
        promise.callUnhandledRejection(reason)
        return
    }

    /**
     * Логировать ошибку, если она относится к приложению
     */
    {
        getAppLogger().fatal(getLoggerErrorFormat(reason), 'unhandledRejection')
        process.exit(1)
    }
}
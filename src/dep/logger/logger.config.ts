import { interfaces } from 'inversify'
import { LoggerConfig } from './logger.types'
import os from 'os'

export async function getHttpLoggerConfig(_: interfaces.Context): Promise<LoggerConfig> {
    return {
        name: 'http',
        level: 'info',
        base: { pid: process.pid, hostname: os.hostname },
        enabled: true
    }
}

export async function getAppLoggerConfig(_: interfaces.Context): Promise<LoggerConfig> {
    return {
        name: 'app',
        level: 'info',
        base: { pid: process.pid, hostname: os.hostname },
        enabled: true
    }
}
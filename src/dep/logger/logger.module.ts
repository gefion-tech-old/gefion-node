import { AsyncContainerModule, interfaces } from 'inversify'
import { LOGGER_SYMBOL, LoggerConfig } from './logger.types'
import { 
    getAppLoggerConfig, 
    getHttpLoggerConfig, 
    getDatabaseLoggerConfig, 
    getScheduleLoggerConfig 
} from './logger.config'
import pino from 'pino'

export const LoggerModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<Promise<LoggerConfig>>(LOGGER_SYMBOL.LoggerHttpConfig)
        .toDynamicValue(getHttpLoggerConfig)
        .inSingletonScope()

    bind<Promise<LoggerConfig>>(LOGGER_SYMBOL.LoggerAppConfig)
        .toDynamicValue(getAppLoggerConfig)
        .inSingletonScope()

    bind<Promise<LoggerConfig>>(LOGGER_SYMBOL.LoggerDatabaseConfig)
        .toDynamicValue(getDatabaseLoggerConfig)
        .inSingletonScope()

    bind<Promise<LoggerConfig>>(LOGGER_SYMBOL.LoggerScheduleConfig)
        .toDynamicValue(getScheduleLoggerConfig)
        .inSingletonScope()
    
    bind<Promise<pino.Logger>>(LOGGER_SYMBOL.LoggerHttp)
        .toDynamicValue(async (context: interfaces.Context): Promise<pino.Logger> => {
            const container = context.container
            const config = await container
                .get<Promise<LoggerConfig>>(LOGGER_SYMBOL.LoggerHttpConfig)
            
            return pino(config, pino.destination(config.destination))
        })
        .inSingletonScope()

    bind<Promise<pino.Logger>>(LOGGER_SYMBOL.LoggerApp)
        .toDynamicValue(async (context: interfaces.Context): Promise<pino.Logger> => {
            const container = context.container
            const config = await container
                .get<Promise<LoggerConfig>>(LOGGER_SYMBOL.LoggerAppConfig)
            
            return pino(config, pino.destination(config.destination))
        })
        .inSingletonScope()

    bind<Promise<pino.Logger>>(LOGGER_SYMBOL.LoggerDatabase)
        .toDynamicValue(async (context: interfaces.Context): Promise<pino.Logger> => {
            const container = context.container
            const config = await container
                .get<Promise<LoggerConfig>>(LOGGER_SYMBOL.LoggerDatabaseConfig)
            
            return pino(config, pino.destination(config.destination))
        })
        .inSingletonScope()

    bind<Promise<pino.Logger>>(LOGGER_SYMBOL.LoggerSchedule)
        .toDynamicValue(async (context: interfaces.Context): Promise<pino.Logger> => {
            const container = context.container
            const config = await container
                .get<Promise<LoggerConfig>>(LOGGER_SYMBOL.LoggerScheduleConfig)

            return pino(config, pino.destination(config.destination))
        })
})
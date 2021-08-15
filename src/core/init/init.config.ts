import { interfaces } from 'inversify'
import { InitConfig, InitRunner, INIT_SYMBOL } from './init.types'
import { LOGGER_SYMBOL } from '../../dep/logger/logger.types'
import { Logger } from 'pino'

export async function getInitConfig(context: interfaces.Context): Promise<InitConfig> {
    const container = context.container
    const logger = container
        .get<Logger>(LOGGER_SYMBOL.LoggerApp)

    let runners: InitRunner[] = []
    try {
        runners = container
            .getAll<InitRunner>(INIT_SYMBOL.InitRunner)
    } catch {}
    
    return {
        logger: logger,
        runners: runners
    }
}
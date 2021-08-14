import { interfaces } from 'inversify'
import { ScheduleConfig } from './schedule.types'
import { LOGGER_SYMBOL } from '../../dep/logger/logger.types'
import { Logger } from 'pino'

export async function getScheduleConfig(context: interfaces.Context): Promise<ScheduleConfig> {
    const container = context.container
    const logger = await container
        .get<Logger>(LOGGER_SYMBOL.LoggerSchedule)
    
    return {
        logger: logger
    }
}
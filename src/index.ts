import { getContainer } from './inversify.config'
import { IInitService } from './core/init/init.interface'
import { INIT_SYMBOL } from './core/init/init.types'
import { uncaughtException, unhandledRejection } from './event-handlers'
import { getAppLogger } from './utils/logger'
import { getLoggerErrorFormat } from './utils/error-format'
import { InitError } from './core/init/init.errors'

async function bootstrap() {
    const container = await getContainer()
    
    /**
     * Логировать глобальные неперехваченные ошибки.
     */
    {
        process.on('uncaughtException', uncaughtException)
        process.on('unhandledRejection', unhandledRejection)
    }

    /**
     * Инициализация приложения
     */
    {
        const initService = container
            .get<IInitService>(INIT_SYMBOL.InitService)
    
        try {
            await initService.init()
        } catch(error) {
            if (error instanceof InitError) {
                getAppLogger().fatal(getLoggerErrorFormat(error), 'InitError')
                process.exit(1)
            } else {
                throw error
            }
        }
    }
}

bootstrap()
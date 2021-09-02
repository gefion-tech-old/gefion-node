import { getAppLogger } from './utils/logger'
import { getContainer } from './inversify.config'
import { IInitService } from './core/init/init.interface'
import { INIT_SYMBOL } from './core/init/init.types'
import { getLoggerErrorFormat } from './utils/error-format'

async function bootstrap() {
    const container = await getContainer()

    /**
     * Логировать глобальные неперехваченные ошибки
     */
    {
        process.on('uncaughtException', (error: Error) => {
            getAppLogger().fatal(getLoggerErrorFormat(error), 'uncaughtException')
            process.exit(1)
        })

        process.on('unhandledRejection', (error: any) => {
            getAppLogger().fatal(getLoggerErrorFormat(error), 'unhandledRejection')
            process.exit(1)
        })
    }

    /**
     * Запустить инициализацию приложения
     */
    {
        const initService = container
            .get<IInitService>(INIT_SYMBOL.InitService)
    
    
        await initService.init()
    }

}

bootstrap()
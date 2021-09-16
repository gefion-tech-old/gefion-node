import { getContainer } from './inversify.config'
import { IInitService } from './core/init/init.interface'
import { INIT_SYMBOL } from './core/init/init.types'
import { uncaughtException, unhandledRejection } from './event-handlers'

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
    
        await initService.init()
    }
}

bootstrap()
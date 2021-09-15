import { getAppLogger } from './utils/logger'
import { getContainer } from './inversify.config'
import { IInitService } from './core/init/init.interface'
import { INIT_SYMBOL } from './core/init/init.types'
import { getLoggerErrorFormat } from './utils/error-format'
import { VMPromise } from './api/system-v1/promise/promise.classes'

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

        process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
            /**
             * Запускать у промиса метод callUnhandledRejection, если это промис
             * виртуальной машины.
             * 
             * Подробности в: ./src/api/system-v1/promise/promise.property.ts
             */
            if (promise instanceof VMPromise) {
                promise.callUnhandledRejection(reason)
            }

            /**
             * Логировать ошибку, если она относится к приложению
             */
            {
                getAppLogger().fatal(getLoggerErrorFormat(reason), 'unhandledRejection')
                process.exit(1)
            }
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
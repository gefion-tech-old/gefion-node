import { getContainer } from './inversify.config'
import { IInitService } from './core/init/init.interface'
import { INIT_SYMBOL } from './core/init/init.types'

async function bootstrap() {
    const container = await getContainer()

    const initService = container
        .get<IInitService>(INIT_SYMBOL.InitService)

    await initService.init()
}

bootstrap()
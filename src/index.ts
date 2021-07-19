import { initContainer } from './inversify.config'

async function bootstrap() {
    await initContainer()
}

bootstrap()
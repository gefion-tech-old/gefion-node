import { getContainer } from '../../inversify.config'
import { FASTIFY_SYMBOL } from './fastify.types'
import { IFastifyService } from './fastify.interface'
import { getInitConfig } from './__mock/FastifyConfig.mock'
import { AddressInfo } from 'net'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('Модуль Fastify', () => {

    it(`
        Сервер успешно запускается и его экземляр возвращается. Повторные попытки
        запуска возвращают уже созданный экземпляр
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        container.rebind(FASTIFY_SYMBOL.FastifyConfig)
            .toDynamicValue(getInitConfig({
                plugins: []
            }))

        const fastifyService = container
            .get<IFastifyService>(FASTIFY_SYMBOL.FastifyService)

        const instance1 = await fastifyService.fastify()
        const instance2 = await fastifyService.fastify()

        expect(instance1).toBe(instance2)
        expect(typeof (instance1.server.address() as AddressInfo).port).toBe('number')

        instance1.close()
        container.restore()
    })

    it(`
        Если при регистрации плагина в нём произошла ошибка, то она успешно перехватывается
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const MyError = class extends Error {}

        container.rebind(FASTIFY_SYMBOL.FastifyConfig)
            .toDynamicValue(getInitConfig({
                plugins: [
                    async function() {
                        throw new MyError
                    }
                ]
            }))

        const fastifyService = container
            .get<IFastifyService>(FASTIFY_SYMBOL.FastifyService)

        expect(fastifyService.fastify()).rejects.toBeInstanceOf(MyError)

        container.restore()
    })

})
import { getContainer } from '../../../inversify.config'
import { getHostFilterMiddlewarePlugin } from './host-filter.middleware'
import { IFastifyService } from '../fastify.interface'
import { FASTIFY_SYMBOL } from '../fastify.types'
import { getInitConfig } from '../__mock/FastifyConfig.mock'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('HostFilterMiddleware в FastifyModule', () => {

    it(`
        Попытка сделать запрос с неразрешённым доменом запускает обработчик 404. Запрос с разрешённым 
        доменом корректно обрабатывается
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        container.rebind(FASTIFY_SYMBOL.FastifyConfig)
            .toDynamicValue(getInitConfig({
                plugins: [
                    async function(instance) {
                        instance.register(getHostFilterMiddlewarePlugin(async () => ['localhost']))

                        instance.get('/test', async () => {
                            return {
                                success: true
                            }
                        })
                    }
                ]
            }))

        const fastifyService = container
            .get<IFastifyService>(FASTIFY_SYMBOL.FastifyService)
        const fastifyInstance = await fastifyService.fastify()

        const response1 = await fastifyInstance.inject({
            method: 'get',
            url: '/api/test'
        })
        expect(response1.statusCode).toBe(404)

        const response2 = await fastifyInstance.inject({
            method: 'get',
            url: '/api/test',
            authority: 'localhost'
        })
        expect(response2.statusCode).toBe(200)
        expect(response2.json()).toMatchObject({
            success: true
        })

        const response3 = await fastifyInstance.inject({
            method: 'get',
            url: '/api/test',
            headers: {
                host: 'localhost'
            }
        })
        expect(response3.statusCode).toBe(200)
        expect(response3.json()).toMatchObject({
            success: true
        })

        fastifyInstance.close()
        container.restore()
    })

})
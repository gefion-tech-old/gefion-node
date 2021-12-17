import { getContainer } from '../../../inversify.config'
import { FASTIFY_SYMBOL } from '../../fastify/fastify.types'
import { IFastifyService } from '../fastify.interface'
import { getInitConfig } from '../__mock/FastifyConfig.mock'
import { getCacheNoStoreMiddlewarePlugin } from './cache-no-store.middleware'
import fp from 'fastify-plugin'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('CacheNoStoreMiddleware в FastifyModule', () => {

    it(`
        Заголовок для отключения кеша корректно добавляется ко всем ответам за исключением
        тех ответов, которые явно его переопределили. Не исключение и ответы с ошибками
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        container.rebind(FASTIFY_SYMBOL.FastifyConfig)
            .toDynamicValue(getInitConfig({
                hosts: ['localhost'],
                plugins: [
                    fp(async (instance) => {
                        instance.register(getCacheNoStoreMiddlewarePlugin())

                        instance.get('/success', async () => {
                            return {}
                        })

                        instance.get('/error', async () => {
                            throw {}
                        })

                        instance.get('/cache', async (_, reply) => {
                            reply.header('cache-control', 'public, max-age=31536000')
                            return {}
                        })
                    })
                ]
            }))

        const fastifyService = container
            .get<IFastifyService>(FASTIFY_SYMBOL.FastifyService)
        const fastifyInstance = await fastifyService.fastify()

        const response1 = await fastifyInstance.inject({
            method: 'get',
            url: '/success',
            authority: 'localhost'
        })
        expect(response1.statusCode).toBe(200)
        expect(response1.headers).toMatchObject({
            'cache-control': 'no-store'
        })
        
        const response2 = await fastifyInstance.inject({
            method: 'get',
            url: '/error',
            authority: 'localhost'
        })
        expect(response2.statusCode).toBe(500)
        expect(response2.headers).toMatchObject({
            'cache-control': 'no-store'
        })

        const response3 = await fastifyInstance.inject({
            method: 'get',
            url: '/cache',
            authority: 'localhost'
        })
        expect(response3.statusCode).toBe(200)
        expect(response3.headers).toMatchObject({
            'cache-control': 'public, max-age=31536000'
        })

        const response4 = await fastifyInstance.inject({
            method: 'get',
            url: '/not-found',
            authority: 'localhost'
        })
        expect(response4.statusCode).toBe(404)
        expect(response2.headers).toMatchObject({
            'cache-control': 'no-store'
        })

        fastifyInstance.close()
        container.restore()
    })

})
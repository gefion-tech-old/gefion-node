import { getContainer } from '../../../inversify.config'
import { getCsrfMiddlewarePlugin } from './csrf.middleware'
import { IFastifyService } from '../fastify.interface'
import { FASTIFY_SYMBOL } from '../fastify.types'
import { getInitConfig } from '../__mock/FastifyConfig.mock'
import cookie from 'fastify-cookie'
import { FastifyCookieOptions } from 'fastify-cookie'
import { getHostFilterMiddlewarePlugin } from '../host-filter/host-filter.middleware'
import { InvalidCsrfToken } from './csrf.errors'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('CsrfMiddleware в FastifyModule', () => {

    it(`
        Все методы запроса за исключением GET, OPTIONS и POST в обязательном порядке требуют csrf
        токен
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        container.rebind(FASTIFY_SYMBOL.FastifyConfig)
            .toDynamicValue(getInitConfig({
                plugins: [
                    async function(instance) {
                        instance.register(cookie, {
                            secret: 'secret'
                        } as FastifyCookieOptions)
                        instance.register(getHostFilterMiddlewarePlugin(async () => ['localhost']))
                        instance.register(getCsrfMiddlewarePlugin())

                        instance.route({
                            method: ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'OPTIONS'],
                            url: '/test',
                            handler: async () => {
                                return {
                                    success: true
                                }
                            }
                        })
                    }
                ]
            }))

        const fastifyService = container
            .get<IFastifyService>(FASTIFY_SYMBOL.FastifyService)
        const fastifyInstance = await fastifyService.fastify()
        
        const response1 = await fastifyInstance.inject({
            method: 'delete',
            authority: 'localhost',
            url: '/api/test'
        })
        expect(response1.statusCode).toBe(419)
        expect(response1.json()).toMatchObject({
            error: {
                name: (new InvalidCsrfToken).name
            }
        })

        const response2 = await fastifyInstance.inject({
            method: 'get',
            authority: 'localhost',
            url: '/api/test'
        })
        expect(response2.statusCode).toBe(200)
        expect(response2.json()).toMatchObject({
            success: true
        })

        const response3 = await fastifyInstance.inject({
            method: 'head',
            authority: 'localhost',
            url: '/api/test'
        })
        expect(response3.statusCode).toBe(200)
        expect(response3.json()).toMatchObject({
            success: true
        })

        const response4 = await fastifyInstance.inject({
            method: 'patch',
            authority: 'localhost',
            url: '/api/test'
        })
        expect(response4.statusCode).toBe(419)
        expect(response4.json()).toMatchObject({
            error: {
                name: (new InvalidCsrfToken).name
            }
        })

        const response5 = await fastifyInstance.inject({
            method: 'post',
            authority: 'localhost',
            url: '/api/test'
        })
        expect(response5.statusCode).toBe(419)
        expect(response5.json()).toMatchObject({
            error: {
                name: (new InvalidCsrfToken).name
            }
        })

        const response6 = await fastifyInstance.inject({
            method: 'put',
            authority: 'localhost',
            url: '/api/test'
        })
        expect(response6.statusCode).toBe(419)
        expect(response6.json()).toMatchObject({
            error: {
                name: (new InvalidCsrfToken).name
            }
        })

        const response7 = await fastifyInstance.inject({
            method: 'options',
            authority: 'localhost',
            url: '/api/test'
        })
        expect(response7.statusCode).toBe(200)
        expect(response7.json()).toMatchObject({
            success: true
        })

        fastifyInstance.close()
        container.restore()
    })

    it(`
        Попытка сделать post/delete/patch/put запрос с неправильным или изменённым и указанными через
        header/body/querystring csrf токеном приводит к исключению. Запрос же с правильным csrf токеном
        проходит успешно
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        container.rebind(FASTIFY_SYMBOL.FastifyConfig)
            .toDynamicValue(getInitConfig({
                plugins: [
                    async function(instance) {
                        instance.register(cookie, {
                            secret: 'secret'
                        } as FastifyCookieOptions)
                        instance.register(getHostFilterMiddlewarePlugin(async () => ['localhost']))
                        instance.register(getCsrfMiddlewarePlugin())

                        instance.route({
                            method: ['GET', 'DELETE', 'PATCH', 'POST', 'PUT'],
                            url: '/test',
                            handler: async (request) => {
                                return {
                                    success: true,
                                    csrfSecret: await request.csrfSecret()
                                }
                            }
                        })
                    }
                ]
            }))

        const fastifyService = container
            .get<IFastifyService>(FASTIFY_SYMBOL.FastifyService)
        const fastifyInstance = await fastifyService.fastify()

        /**
         * Получить через подписанное cookie csrf токена и csrf секрет
         */
        const [csrfCookie, csrfSecret] = await (async (): Promise<[string, string]> => {
            const response = await fastifyInstance.inject({
                method: 'get',
                authority: 'localhost',
                url: '/api/test'
            })
            const cookie = response.cookies.find((cookie: any) => cookie.name === '__gf_csrf') as any
            return [cookie.value, response.json().csrfSecret]
        })()

        const params = (() => {
            const requestMethods: ['post', 'delete', 'put', 'patch'] = ['post', 'delete', 'put', 'patch']
            const csrfSecretMethods: ['header', 'body', 'querystring'] = ['header', 'body', 'querystring']
            const params: {
                requestMethod: 'post' | 'delete' | 'put' | 'patch'
                csrfSecretMethod: 'header' | 'body' | 'querystring'
            }[] = []

            for (const method of requestMethods) {
                for (const csrfMethods of csrfSecretMethods) {
                    params.push({
                        requestMethod: method,
                        csrfSecretMethod: csrfMethods
                    })
                }
            }

            return params
        })()
        
        /**
         * Неправильный секрет
         */
        const responses1 = await Promise.all(params.map(params => {
            const secretObject = (() => {
                if (params.csrfSecretMethod === 'body') {
                    return {
                        payload: {
                            __gf_csrf: 'secret'
                        }   
                    }
                }

                if (params.csrfSecretMethod === 'querystring') {
                    return {
                        url: `/api/test?__gf_csrf=${'secret'}`
                    }
                }

                if (params.csrfSecretMethod === 'header') {
                    return {
                        headers: {
                            __gf_csrf: 'secret'
                        }
                    }
                }

                return {}
            })()

            return fastifyInstance.inject({
                method: params.requestMethod,
                authority: 'localhost',
                url: '/api/test',
                cookies: {
                    __gf_csrf: csrfCookie
                },
                ...secretObject
            })
        }))
        
        for (const response of responses1) {
            expect(response.statusCode).toBe(419)
            expect(response.json()).toMatchObject({
                error: {
                    name: (new InvalidCsrfToken).name
                }
            })
        }

        /**
         * Неправильный токен
         */
        const responses2 = await Promise.all(params.map(params => {
            const secretObject = (() => {
                if (params.csrfSecretMethod === 'body') {
                    return {
                        payload: {
                            __gf_csrf: csrfSecret
                        }   
                    }
                }

                if (params.csrfSecretMethod === 'querystring') {
                    return {
                        url: `/api/test?__gf_csrf=${csrfSecret}`
                    }
                }

                if (params.csrfSecretMethod === 'header') {
                    return {
                        headers: {
                            __gf_csrf: csrfSecret
                        }
                    }
                }

                return {}
            })()

            return fastifyInstance.inject({
                method: params.requestMethod,
                authority: 'localhost',
                url: '/api/test',
                cookies: {
                    __gf_csrf: 'cookie'
                },
                ...secretObject
            })
        }))
        
        for (const response of responses2) {
            expect(response.statusCode).toBe(419)
            expect(response.json()).toMatchObject({
                error: {
                    name: (new InvalidCsrfToken).name
                }
            })
        }

        /**
         * Всё правильно
         */
        const responses3 = await Promise.all(params.map(params => {
            const secretObject = (() => {
                if (params.csrfSecretMethod === 'body') {
                    return {
                        payload: {
                            __gf_csrf: csrfSecret
                        }   
                    }
                }

                if (params.csrfSecretMethod === 'querystring') {
                    return {
                        url: `/api/test?__gf_csrf=${csrfSecret}`
                    }
                }

                if (params.csrfSecretMethod === 'header') {
                    return {
                        headers: {
                            __gf_csrf: csrfSecret
                        }
                    }
                }

                return {}
            })()

            return fastifyInstance.inject({
                method: params.requestMethod,
                authority: 'localhost',
                url: '/api/test',
                cookies: {
                    __gf_csrf: csrfCookie
                },
                ...secretObject
            })
        }))

        for (const response of responses3) {
            expect(response.statusCode).toBe(200)
            expect(response.json()).toMatchObject({
                success: true
            })
        }

        fastifyInstance.close()
        container.restore()
    })

    it(`
        Попытка получить секрет CSRF токена приводит к его сохранению в cookie в любом методе запроса
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        container.rebind(FASTIFY_SYMBOL.FastifyConfig)
            .toDynamicValue(getInitConfig({
                plugins: [
                    async function(instance) {
                        instance.register(cookie, {
                            secret: 'secret'
                        } as FastifyCookieOptions)
                        instance.register(getHostFilterMiddlewarePlugin(async () => ['localhost']))
                        instance.register(getCsrfMiddlewarePlugin())

                        instance.route({
                            method: ['GET', 'OPTIONS', 'HEAD', 'DELETE', 'PATCH', 'POST', 'PUT'],
                            url: '/test',
                            handler: async (request) => {
                                return {
                                    success: true,
                                    csrfSecret: await request.csrfSecret()
                                }
                            }
                        })
                    }
                ]
            }))

        const fastifyService = container
            .get<IFastifyService>(FASTIFY_SYMBOL.FastifyService)
        const fastifyInstance = await fastifyService.fastify()

        /**
         * Получить через подписанное cookie csrf токена и csrf секрет
         */
         const [csrfCookie, csrfSecret] = await (async (): Promise<[string, string]> => {
            const response = await fastifyInstance.inject({
                method: 'get',
                authority: 'localhost',
                url: '/api/test'
            })
            const cookie = response.cookies.find((cookie: any) => cookie.name === '__gf_csrf') as any
            return [cookie.value, response.json().csrfSecret]
        })()

        const responses = await Promise.all(['GET', 'OPTIONS', 'HEAD', 'DELETE', 'PATCH', 'POST', 'PUT'].map(method => {
            return fastifyInstance.inject({
                method: method as any,
                authority: 'localhost',
                url: '/api/test',
                cookies: {
                    __gf_csrf: csrfCookie
                },
                headers: {
                    __gf_csrf: csrfSecret
                }
            })
        }))

        for (const response of responses) {
            expect(response.statusCode).toBe(200)
            expect(response.cookies.find((cookie: any) => cookie.name === '__gf_csrf')).not.toMatchObject({
                value: csrfCookie
            })
            const json = response.json()
            expect(json).toMatchObject({
                success: true
            })
            expect(json).not.toMatchObject({
                csrfSecret: csrfSecret
            })
        }

        fastifyInstance.close()
        container.restore()
    })

})
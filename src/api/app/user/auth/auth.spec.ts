import { getContainer } from '../../../../inversify.config'
import { getRemoteAuthService } from '../__mock/RemoteAuthService.mock'
import { getAuthConfig } from '../__mock/AuthConfig.mock'
import { USER_SYMBOL } from '../user.types'
import { IAuthService } from './auth.interface'
import { Tokens, AuthConfig } from './auth.types'
import jwt from 'jsonwebtoken'
import { IFastifyService } from '../../../../core/fastify/fastify.interface'
import { FASTIFY_SYMBOL, FastifyConfig } from '../../../../core/fastify/fastify.types'
import { getInitConfig } from '../../../../core/fastify/__mock/FastifyConfig.mock'
import { getAuthService } from '../__mock/AuthService.mock'
import { IDefaultPluginService } from '../../../../core/fastify/default-plugin/default-plugin.interfaces'
import { getAuthMiddlewarePlugin } from './auth.middleware'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()

    const fastifyConfig = await container
        .get<Promise<FastifyConfig>>(FASTIFY_SYMBOL.FastifyConfig)
    container.rebind(FASTIFY_SYMBOL.FastifyConfig)
        .toDynamicValue(getInitConfig({
            hosts: ['localhost'],
            plugins: fastifyConfig.plugins,
            secret: 'secret'
        }))
        .inSingletonScope()

    container.rebind(USER_SYMBOL.AuthConfig)
        .toDynamicValue(getAuthConfig({
            loginUncorrectRedirect: '/uncorrect',
            loginCorrectRedirect: '/correct',
            logoutRedirect: '/logout'
        }))
        .inSingletonScope()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('AuthService в UserModule', () => {

    it(`
        Аутентификация через удалённый сервис с помощью некорректного кода аутентификации
        возвращает undefined
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const loginFn = jest.fn()

        container.rebind(USER_SYMBOL.RemoteAuthService)
            .to(getRemoteAuthService({
                login: async (code) => {
                    loginFn(code)
                    
                    if (code === 'uncorrect') {
                        return undefined
                    }

                    return {
                        accessToken: '',
                        accessTokenExpires: new Date,
                        authVerifyPayload: {
                            username: ''
                        },
                        refreshToken: '',
                        refreshTokenExpires: new Date
                    } as Tokens
                },
                refreshToken: async () => undefined
            }))
            .inSingletonScope()
            
        const authService = container
            .get<IAuthService>(USER_SYMBOL.AuthService)

        await expect(authService.login('11111')).resolves.not.toBeUndefined()
        expect(loginFn).lastCalledWith('11111')
        await expect(authService.login('uncorrect')).resolves.toBeUndefined()
        expect(loginFn).lastCalledWith('uncorrect')
        expect(loginFn).toBeCalledTimes(2)

        container.restore()
    })

    it(`
        Аутентификация через удалённый сервис с помощью кода аутентификации проходит успешно
        и возвзращает объект с токенами при условии, что указан корректный код
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const loginFn = jest.fn()
        const date = new Date(Date.now() + 1000 * 60 * 60 * 24)

        container.rebind(USER_SYMBOL.RemoteAuthService)
            .to(getRemoteAuthService({
                login: async (code) => {
                    loginFn(code)
                    
                    if (code === 'uncorrect') {
                        return undefined
                    }

                    return {
                        accessToken: 'accessToken',
                        accessTokenExpires: date,
                        authVerifyPayload: {
                            username: 'username'
                        },
                        refreshToken: 'refreshToken',
                        refreshTokenExpires: date
                    } as Tokens
                },
                refreshToken: async () => undefined
            }))
            .inSingletonScope()

        const authService = container
            .get<IAuthService>(USER_SYMBOL.AuthService)
        const authConfig = await container
            .get<Promise<AuthConfig>>(USER_SYMBOL.AuthConfig)
        
        const tokens = await authService.login('11111') as Tokens
        expect(loginFn).lastCalledWith('11111')
        expect(loginFn).toBeCalledTimes(1)
        
        expect(tokens).toMatchObject({
            authVerifyPayload: {
                username: 'username'
            },
            refreshToken: 'refreshToken'
        })

        const payload = jwt.verify(tokens.accessToken, authConfig.secret) as any

        expect(payload).toMatchObject({
            username: 'username'
        })
        expect((date.getTime() / 1000 - 1) < payload.exp).toBe(true)
        expect(payload.exp < (date.getTime() / 1000 + 1)).toBe(true)
        expect(payload).toMatchObject(await authService.verify(tokens.accessToken) as any)

        container.restore()
    })

    it(`
        Попытка верифицировать некорректный access токен возвращает undefined, а корректный -
        полезную нагрузку
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const date = new Date(Date.now() + 1000 * 60 * 60 * 24)

        container.rebind(USER_SYMBOL.RemoteAuthService)
            .to(getRemoteAuthService({
                login: async () => {
                    return {
                        accessToken: 'accessToken',
                        accessTokenExpires: date,
                        authVerifyPayload: {
                            username: 'username'
                        },
                        refreshToken: 'refreshToken',
                        refreshTokenExpires: date
                    } as Tokens
                },
                refreshToken: async () => undefined
            }))
            .inSingletonScope()

        const authService = container
            .get<IAuthService>(USER_SYMBOL.AuthService)
        const authConfig = await container
            .get<Promise<AuthConfig>>(USER_SYMBOL.AuthConfig)

        await expect((async () => {
            jwt.verify('incorrectToken', authConfig.secret)
        })()).rejects.toBeInstanceOf(jwt.JsonWebTokenError)
        await expect(authService.verify('incorrectToken')).resolves.toBeUndefined()

        const oldToken = jwt.sign({}, authConfig.secret, {
            expiresIn: '1ms'
        })
        
        await new Promise(resolve => {
            setTimeout(resolve, 2)
        })

        await expect((async () => {
            jwt.verify(oldToken, authConfig.secret)
        })()).rejects.toBeInstanceOf(jwt.TokenExpiredError)
        await expect(authService.verify(oldToken)).resolves.toBeUndefined()

        await expect(authService.verify((await authService.login('') as any).accessToken)).resolves.toMatchObject({
            username: 'username'
        })

        container.restore()
    })

    it(`
        Токены корректно обновляются в случае, если удалённый сервис аутентификации их возвращает, в
        противном случае возвращается undefined
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const refreshTokenFn = jest.fn()
        const date = new Date(Date.now() + 1000 * 60 * 60 * 24)

        container.rebind(USER_SYMBOL.RemoteAuthService)
            .to(getRemoteAuthService({
                login: async () => undefined,
                refreshToken: async (refreshToken, ua, ip) => {
                    refreshTokenFn(refreshToken, ua, ip)

                    if (refreshToken === 'uncorrect') {
                        return undefined
                    }

                    return {
                        accessToken: 'accessToken',
                        accessTokenExpires: date,
                        authVerifyPayload: {
                            username: 'username'
                        },
                        refreshToken: 'refreshToken',
                        refreshTokenExpires: date
                    } as Tokens
                }
            }))
            .inSingletonScope()

        const authService = container
            .get<IAuthService>(USER_SYMBOL.AuthService)

        const tokens = await authService.refreshToken('token', 'ua', 'ip') as Tokens

        expect(tokens).toMatchObject({
            authVerifyPayload: {
                username: 'username'
            },
            refreshToken: 'refreshToken'
        })
        await expect(authService.verify(tokens.accessToken)).resolves.toMatchObject({
            username: 'username'
        })
        await expect(authService.refreshToken('uncorrect', 'ua', 'ip')).resolves.toBeUndefined()

        expect(refreshTokenFn).toBeCalledTimes(2)
        expect(refreshTokenFn).toHaveBeenNthCalledWith(1, 'token', 'ua', 'ip')
        expect(refreshTokenFn).toHaveBeenNthCalledWith(2, 'uncorrect', 'ua', 'ip')

        container.restore()
    })

})

describe('AuthHttp в UserModule', () => {

    it(`
        Попытка авторизоваться без указания кода аутентификации завершается ошибкой валидации
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const fastifyService = container
            .get<IFastifyService>(FASTIFY_SYMBOL.FastifyService)
        const fastifyInstance = await fastifyService.fastify()

        const response = await fastifyInstance.inject({
            method: 'get',
            url: '/api/v1/login',
            authority: 'localhost'
        })

        expect(response.statusCode).toBe(400)

        fastifyInstance.close()
        container.restore()
    })

    it(`
        Попытка авторизоваться с указанием некорректного кода авторизации возвращает
        ответ для редиректа на страницу некорректной авторизации
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const loginFn = jest.fn()

        container.rebind(USER_SYMBOL.AuthService)
            .to(getAuthService({
                login: async (code) => {
                    loginFn(code)
                    return undefined
                },
                refreshToken: async () => undefined,
                verify: async () => undefined
            }))
            .inSingletonScope()

        const fastifyService = container
            .get<IFastifyService>(FASTIFY_SYMBOL.FastifyService)
        const fastifyInstance = await fastifyService.fastify()

        const response = await fastifyInstance.inject({
            method: 'get',
            url: '/api/v1/login',
            authority: 'localhost',
            query: {
                code: '11111'
            }
        })

        expect(loginFn).toBeCalledTimes(1)
        expect(loginFn).toHaveBeenLastCalledWith('11111')

        expect(response.statusCode).toBe(302)
        expect(response.headers).toMatchObject({
            location: '/uncorrect'
        })

        fastifyInstance.close()
        container.restore()
    })

    it(`
        Корректная авторизация возвращает ответ с refresh и access токенами в cookie и 
        заголовках и редиректом на страницу корректно авторизации
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const loginFn = jest.fn()
        const date = new Date(Date.now() + 1000 * 60 * 60 * 24)

        container.rebind(USER_SYMBOL.AuthService)
            .to(getAuthService({
                login: async (code) => {
                    loginFn(code)
                    return {
                        accessToken: 'accessToken',
                        accessTokenExpires: date,
                        authVerifyPayload: {
                            username: 'username'
                        },
                        refreshToken: 'refreshToken',
                        refreshTokenExpires: date
                    } as Tokens
                },
                refreshToken: async () => undefined,
                verify: async () => undefined
            }))
            .inSingletonScope()

        const fastifyService = container
            .get<IFastifyService>(FASTIFY_SYMBOL.FastifyService)
        const fastifyInstance = await fastifyService.fastify()

        const response = await fastifyInstance.inject({
            method: 'get',
            url: '/api/v1/login',
            query: {
                code: '11111'
            },
            authority: 'localhost'
        })

        expect(loginFn).toBeCalledTimes(1)
        expect(loginFn).toHaveBeenLastCalledWith('11111')
        expect(response.statusCode).toBe(302)
        expect(response.headers).toMatchObject({
            __gf_access_token: 'accessToken',
            __gf_refresh_token: 'refreshToken',
            location: '/correct'
        })
        expect(response.cookies).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: '__gf_refresh_token',
                    value: 'refreshToken',
                    domain: 'localhost',
                    path: '/',
                    httpOnly: true,
                    sameSite: 'Strict'
                }),
                expect.objectContaining({
                    name: '__gf_access_token',
                    value: 'accessToken',
                    domain: 'localhost',
                    path: '/',
                    httpOnly: true,
                    sameSite: 'Strict'
                })
            ])
        )
        expect((response.cookies.find((cookie: any) => cookie.name === '__gf_refresh_token') as any).expires.toJSON())
            .toBe(date.toJSON().slice(0, -4) + '000Z')
        expect((response.cookies.find((cookie: any) => cookie.name === '__gf_access_token') as any).expires.toJSON())
            .toBe(date.toJSON().slice(0, -4) + '000Z')

        fastifyInstance.close()
        container.restore()
    })

    it(`
        Выход из аккаунта возвращает ответ с редиректом на страницу успешного выхода из аккаунта
        и cookie, которая очищает ранее установленные cookie
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const fastifyService = container
            .get<IFastifyService>(FASTIFY_SYMBOL.FastifyService)
        const fastifyInstance = await fastifyService.fastify()

        const response = await fastifyInstance.inject({
            method: 'get',
            url: '/api/v1/logout',
            authority: 'localhost'
        })

        expect(response.statusCode).toBe(302)
        expect(response.headers).toMatchObject({
            location: '/logout'
        })

        expect((response.cookies.find((cookie: any) => cookie.name === '__gf_refresh_token') as any).expires.getTime())
            .toBe(new Date(0).getTime())
        expect((response.cookies.find((cookie: any) => cookie.name === '__gf_access_token') as any).expires.getTime())
            .toBe(new Date(0).getTime())
        
        fastifyInstance.close()
        container.restore()
    })

})

describe('AuthMiddleware в UserModule', () => {

    it(`
        Запросы без или с некорректными access и refresh токенами проходят через промежуточное ПО 
        неавторизованными. Токены могут быть либо в cookie, либо в заголовке
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const verifyFn = jest.fn()
        const refreshTokenFn = jest.fn()

        const defaultPluginService = container
            .get<IDefaultPluginService>(FASTIFY_SYMBOL.DefaultPluginService)

        container.rebind(USER_SYMBOL.AuthService)
            .to(getAuthService({
                login: async () => undefined,
                refreshToken: async (refreshToken, ua, ip) => {
                    refreshTokenFn(refreshToken, ua, ip)
                    return undefined
                },
                verify: async (accessToken) => {
                    verifyFn(accessToken)
                    return undefined
                }
            }))
            .inSingletonScope()
        container.rebind(FASTIFY_SYMBOL.FastifyConfig)
            .toDynamicValue(getInitConfig({
                hosts: ['localhost'],
                plugins: [
                    async function(instance) {
                        await Promise.all([
                            defaultPluginService.registerCookiePlugin(instance),
                            defaultPluginService.registerHostFilterMiddlewatePlugin(instance)
                        ])

                        instance.register(getAuthMiddlewarePlugin())

                        instance.get('/test', {
                            handler: async (request) => {
                                return {
                                    authVerifyPayload: request.authVerifyPayload
                                }
                            }
                        })
                    }
                ],
                secret: 'secret'
            }))
            .inSingletonScope()

        const fastifyService = container
            .get<IFastifyService>(FASTIFY_SYMBOL.FastifyService)
        const fastifyInstance = await fastifyService.fastify()

        const response1 = await fastifyInstance.inject({
            method: 'get',
            url: '/api/test',
            authority: 'localhost'
        })
        expect(response1.statusCode).toBe(200)
        expect(response1.json()).toMatchObject({
            authVerifyPayload: null
        })
        expect(verifyFn).toBeCalledTimes(0)

        const response2 = await fastifyInstance.inject({
            method: 'get',
            url: '/api/test',
            authority: 'localhost',
            headers: {
                'user-agent': 'ua',
                'x-forwarded-for': 'ip'
            },
            cookies: {
                __gf_access_token: 'cookie_access_token',
                __gf_refresh_token: 'cookie_refresh_token'
            }
        })
        expect(response2.statusCode).toBe(200)
        expect(response2.json()).toMatchObject({
            authVerifyPayload: null
        })
        expect(verifyFn).toBeCalledTimes(1)
        expect(verifyFn).toHaveBeenNthCalledWith(1, 'cookie_access_token')
        expect(refreshTokenFn).toBeCalledTimes(1)
        expect(refreshTokenFn).toHaveBeenNthCalledWith(1, 'cookie_refresh_token', 'ua', 'ip')

        const response3 = await fastifyInstance.inject({
            method: 'get',
            url: '/api/test',
            authority: 'localhost',
            headers: {
                __gf_access_token: 'header_access_token',
                __gf_refresh_token: 'header_refresh_token',
                'user-agent': 'ua',
                'x-forwarded-for': 'ip'
            }
        })
        expect(response3.statusCode).toBe(200)
        expect(response3.json()).toMatchObject({
            authVerifyPayload: null
        })
        expect(verifyFn).toBeCalledTimes(2)
        expect(verifyFn).toHaveBeenNthCalledWith(2, 'header_access_token')
        expect(refreshTokenFn).toBeCalledTimes(2)
        expect(refreshTokenFn).toHaveBeenNthCalledWith(2, 'header_refresh_token', 'ua', 'ip')

        fastifyInstance.close()
        container.restore()
    })

    it(`
        Запросы с правильным access токеном проходят через промежуточное ПО и авторизовывают
        пользователя. Токен может быть либо в cookie, либо в заголовке
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const verifyFn = jest.fn()

        const defaultPluginService = container
            .get<IDefaultPluginService>(FASTIFY_SYMBOL.DefaultPluginService)

        container.rebind(USER_SYMBOL.AuthService)
            .to(getAuthService({
                login: async () => undefined,
                refreshToken: async () => undefined,
                verify: async (accessToken) => {
                    verifyFn(accessToken)
                    return {
                        username: 'username'
                    }
                }
            }))
            .inSingletonScope()
        container.rebind(FASTIFY_SYMBOL.FastifyConfig)
            .toDynamicValue(getInitConfig({
                hosts: ['localhost'],
                plugins: [
                    async function(instance) {
                        await Promise.all([
                            defaultPluginService.registerCookiePlugin(instance),
                            defaultPluginService.registerHostFilterMiddlewatePlugin(instance)
                        ])

                        instance.register(getAuthMiddlewarePlugin())

                        instance.get('/test', {
                            handler: async (request) => {
                                return {
                                    authVerifyPayload: request.authVerifyPayload
                                }
                            }
                        })
                    }
                ],
                secret: 'secret'
            }))
            .inSingletonScope()

        const fastifyService = container
            .get<IFastifyService>(FASTIFY_SYMBOL.FastifyService)
        const fastifyInstance = await fastifyService.fastify()

        const response1 = await fastifyInstance.inject({
            method: 'get',
            url: '/api/test',
            authority: 'localhost',
            cookies: {
                __gf_access_token: 'cookie_access_token'
            }
        })
        expect(response1.statusCode).toBe(200)
        expect(response1.json()).toMatchObject({
            authVerifyPayload: {
                username: 'username'
            }
        })
        expect(verifyFn).toBeCalledTimes(1)
        expect(verifyFn).nthCalledWith(1, 'cookie_access_token')

        const response2 = await fastifyInstance.inject({
            method: 'get',
            url: '/api/test',
            authority: 'localhost',
            headers: {
                __gf_access_token: 'header_access_token'
            }
        })
        expect(response2.statusCode).toBe(200)
        expect(response2.json()).toMatchObject({
            authVerifyPayload: {
                username: 'username'
            }
        })
        expect(verifyFn).toBeCalledTimes(2)
        expect(verifyFn).nthCalledWith(2, 'header_access_token')

        fastifyInstance.close()
        container.restore()
    })

    it(`
        Запросы с некорректным или отсуствующим access токеном, но корректным refresh токеном
        обновляют токены и прикрепляют их к предстоящему ответу. После запрос авторизовывается
        и проходят дальше через промежуточное ПО. Токен может быть либо в cookie, либо в заголовке
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const verifyFn = jest.fn()
        const refreshTokenFn = jest.fn()
        const date = new Date(Date.now() + 1000 * 60 * 60 * 24)

        const defaultPluginService = container
            .get<IDefaultPluginService>(FASTIFY_SYMBOL.DefaultPluginService)

        container.rebind(USER_SYMBOL.AuthService)
            .to(getAuthService({
                login: async () => undefined,
                refreshToken: async (refreshToken, ua, ip) => {
                    refreshTokenFn(refreshToken, ua, ip)
                    return {
                        accessToken: 'accessToken',
                        accessTokenExpires: date,
                        authVerifyPayload: {
                            username: 'username'
                        },
                        refreshToken: 'refreshToken',
                        refreshTokenExpires: date
                    } as Tokens
                },
                verify: async (accessToken) => {
                    verifyFn(accessToken)
                    return undefined
                }
            }))
            .inSingletonScope()
        container.rebind(FASTIFY_SYMBOL.FastifyConfig)
            .toDynamicValue(getInitConfig({
                hosts: ['localhost'],
                plugins: [
                    async function(instance) {
                        await Promise.all([
                            defaultPluginService.registerCookiePlugin(instance),
                            defaultPluginService.registerHostFilterMiddlewatePlugin(instance)
                        ])

                        instance.register(getAuthMiddlewarePlugin())

                        instance.get('/test', {
                            handler: async (request) => {
                                return {
                                    authVerifyPayload: request.authVerifyPayload
                                }
                            }
                        })
                    }
                ],
                secret: 'secret'
            }))
            .inSingletonScope()

        const fastifyService = container
            .get<IFastifyService>(FASTIFY_SYMBOL.FastifyService)
        const fastifyInstance = await fastifyService.fastify()

        const response1 = await fastifyInstance.inject({
            method: 'get',
            url: '/api/test',
            authority: 'localhost',
            headers: {
                'user-agent': 'ua',
                'x-forwarded-for': 'ip'
            },
            cookies: {
                __gf_refresh_token: 'cookie_refresh_token'
            }
        })
        expect(response1.statusCode).toBe(200)
        expect(response1.json()).toMatchObject({
            authVerifyPayload: {
                username: 'username'
            }
        })
        expect(verifyFn).toBeCalledTimes(0)
        expect(refreshTokenFn).toBeCalledTimes(1)
        expect(refreshTokenFn).nthCalledWith(1, 'cookie_refresh_token', 'ua', 'ip')
        expect(response1.headers).toMatchObject({
            __gf_access_token: 'accessToken',
            __gf_refresh_token: 'refreshToken'
        })
        expect(response1.cookies).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: '__gf_refresh_token',
                    value: 'refreshToken',
                    domain: 'localhost',
                    path: '/',
                    httpOnly: true,
                    sameSite: 'Strict'
                }),
                expect.objectContaining({
                    name: '__gf_access_token',
                    value: 'accessToken',
                    domain: 'localhost',
                    path: '/',
                    httpOnly: true,
                    sameSite: 'Strict'
                })
            ])
        )
        expect((response1.cookies.find((cookie: any) => cookie.name === '__gf_refresh_token') as any).expires.toJSON())
            .toBe(date.toJSON().slice(0, -4) + '000Z')
        expect((response1.cookies.find((cookie: any) => cookie.name === '__gf_access_token') as any).expires.toJSON())
            .toBe(date.toJSON().slice(0, -4) + '000Z')

        const response2 = await fastifyInstance.inject({
            method: 'get',
            url: '/api/test',
            authority: 'localhost',
            headers: {
                'user-agent': 'ua',
                'x-forwarded-for': 'ip',
                __gf_refresh_token: 'header_refresh_token'
            }
        })
        expect(response2.statusCode).toBe(200)
        expect(response2.json()).toMatchObject({
            authVerifyPayload: {
                username: 'username'
            }
        })
        expect(verifyFn).toBeCalledTimes(0)
        expect(refreshTokenFn).toBeCalledTimes(2)
        expect(refreshTokenFn).nthCalledWith(2, 'header_refresh_token', 'ua', 'ip')
        expect(response2.headers).toMatchObject({
            __gf_access_token: 'accessToken',
            __gf_refresh_token: 'refreshToken'
        })
        expect(response2.headers).toMatchObject({
            __gf_access_token: 'accessToken',
            __gf_refresh_token: 'refreshToken'
        })
        expect(response2.cookies).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: '__gf_refresh_token',
                    value: 'refreshToken',
                    domain: 'localhost',
                    path: '/',
                    httpOnly: true,
                    sameSite: 'Strict'
                }),
                expect.objectContaining({
                    name: '__gf_access_token',
                    value: 'accessToken',
                    domain: 'localhost',
                    path: '/',
                    httpOnly: true,
                    sameSite: 'Strict'
                })
            ])
        )
        expect((response2.cookies.find((cookie: any) => cookie.name === '__gf_refresh_token') as any).expires.toJSON())
            .toBe(date.toJSON().slice(0, -4) + '000Z')
        expect((response2.cookies.find((cookie: any) => cookie.name === '__gf_access_token') as any).expires.toJSON())
            .toBe(date.toJSON().slice(0, -4) + '000Z')

        fastifyInstance.close()
        container.restore()
    })

})
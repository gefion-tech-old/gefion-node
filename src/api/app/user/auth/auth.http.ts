import { interfaces } from 'inversify'
import { FastifyPluginAsync } from 'fastify'
import { IAuthService } from './auth.interface'
import { USER_SYMBOL } from '../user.types'
import { AuthConfig } from './auth.types'
import { FASTIFY_SYMBOL } from '../../../../core/fastify/fastify.types'
import {
    IDefaultPluginService
} from '../../../../core/fastify/default-plugin/default-plugin.interfaces'

export async function getAuthHttpPlugin(context: interfaces.Context): Promise<FastifyPluginAsync> {
    const container = context.container
    
    return async function(instance) {
        const authConfig = await container
            .get<Promise<AuthConfig>>(USER_SYMBOL.AuthConfig)
        const defaultPluginService = container
            .get<IDefaultPluginService>(FASTIFY_SYMBOL.DefaultPluginService)
            
        /**
         * Устанавливаю для корректной работы необходимые плагины
         */
        await Promise.all([
            defaultPluginService.registerCookiePlugin(instance),
            defaultPluginService.registerHostFilterMiddlewatePlugin(instance),
            defaultPluginService.registerCacheNoStoreMiddlewarePlugin(instance)
        ])

        /**
         * Маршрут для авторизации
         */
        instance.get<{
            Querystring: {
                code: string
            }
        }>('/v1/login', {
            schema: {
                querystring: {
                    type: 'object',
                    required: ['code'],
                    properties: {
                        code: { type: 'string' }
                    }
                }
            },
            handler: async function(request, reply) {
                const authService = container
                    .get<IAuthService>(USER_SYMBOL.AuthService)

                const tokens = await authService.login(request.query.code)

                if (!tokens) {
                    return reply.redirect(authConfig.loginUncorrectRedirect)
                }

                reply.setCookie('__gf_refresh_token', tokens.refreshToken, {
                    expires: tokens.refreshTokenExpires,
                    httpOnly: true,
                    domain: request.hostname,
                    path: '/',
                    sameSite: true
                })
                reply.setCookie('__gf_access_token', tokens.accessToken, {
                    expires: tokens.accessTokenExpires,
                    httpOnly: true,
                    domain: request.hostname,
                    path: '/',
                    sameSite: true
                })
                reply.headers({
                    '__gf_access_token': tokens.accessToken,
                    '__gf_refresh_token': tokens.refreshToken
                })

                return reply.redirect(authConfig.loginCorrectRedirect)
            }
        })

        /**
         * Маршрут для выхода из аккаунта
         */
        instance.get('/v1/logout', {
            handler: async function(request, reply) {
                reply.clearCookie('__gf_refresh_token', {
                    httpOnly: true,
                    domain: request.hostname,
                    path: '/',
                    sameSite: true
                })
                reply.clearCookie('__gf_access_token', {
                    httpOnly: true,
                    domain: request.hostname,
                    path: '/',
                    sameSite: true
                })
                return reply.redirect(authConfig.logoutRedirect)
            }
        })
    }
}
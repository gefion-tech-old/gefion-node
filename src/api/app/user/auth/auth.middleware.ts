import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { USER_SYMBOL } from '../user.types'
import { IAuthService } from './auth.interface'
import { getContainer } from '../../../../inversify.config'
import { AuthVerifyPayload } from './auth.types'

declare module 'fastify' {
    interface FastifyRequest {
        authVerifyPayload: AuthVerifyPayload | null
    }
}

export function getAuthMiddlewarePlugin(): FastifyPluginAsync {
    return fp(async function(instance) {
        const container = await getContainer()

        /**
         * Декоратор для определения аутентификации пользователя
         */
        instance.decorateRequest('authVerifyPayload', null)
        
        /**
         * Регистрирую промежуточное ПО для аутентификации
         */
        instance.addHook<{
            Headers: {
                __gf_refresh_token?: string
                __gf_access_token?: string
            }
        }>('onRequest', async (request, reply) => {
            const accessToken = (
                request.cookies.__gf_access_token
                ?? request.headers.__gf_access_token
                ?? ''
            )
            const refreshToken = (
                request.cookies.__gf_refresh_token
                ?? request.headers.__gf_refresh_token
                ?? ''
            )
            const authService = container
                .get<IAuthService>(USER_SYMBOL.AuthService)

            const verifyPayload = (
                accessToken.length === 0
                ? undefined
                : await authService.verify(accessToken)
            )

            /**
             * Если аутентификация прошла, то продолжать запрос
             */
            if (verifyPayload) {
                request.authVerifyPayload = verifyPayload
                return
            }

            const tokens = (
                refreshToken.length === 0
                ? undefined
                : await authService.refreshToken(
                    refreshToken,
                    request.headers['user-agent'] ?? '',
                    request.ip
                )
            )

            /**
             * Если токены обновились, то сохранить их в cookie и заголовках, а после
             * продожить запрос
             */
            if (tokens) {
                reply.setCookie('__gf_access_token', tokens.accessToken, {
                    expires: tokens.accessTokenExpires,
                    httpOnly: true,
                    path: '/',
                    domain: request.hostname,
                    sameSite: true
                })

                reply.setCookie('__gf_refresh_token', tokens.refreshToken, {
                    expires: tokens.refreshTokenExpires,
                    httpOnly: true,
                    path: '/',
                    domain: request.hostname,
                    sameSite: true
                })

                reply.headers({
                    '__gf_access_token': tokens.accessToken,
                    '__gf_refresh_token': tokens.refreshToken
                })

                request.authVerifyPayload = tokens.authVerifyPayload
                return
            }

            /**
             * Аутентификация завершилась неудачно, но запрос передать дальше
             */
            request.authVerifyPayload = null
            return
        })
    }, {
        name: 'gf-auth',
        dependencies: ['fastify-cookie', 'gf-host-filter']
    })
}
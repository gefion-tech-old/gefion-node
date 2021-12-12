import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { InvalidCsrfToken } from './csrf.errors'
import CSRF from '@fastify/csrf'

declare module 'fastify' {
    interface FastifyRequest {
        csrfSecret: () => Promise<string>
    }
}

export function getCsrfMiddlewarePlugin(): FastifyPluginAsync {
    return fp(async function(instance) {
        instance.decorateRequest('csrfSecret', null)

        instance.addHook<{
            Headers: {
                __gf_csrf?: string
            }
            Querystring: {
                __gf_csrf?: string
            }
            Body: {
                __gf_csrf?: string
            }
        }>('preHandler', async function(request, reply) {
            let __csrfSecret: string | undefined
            request.csrfSecret = async (): Promise<string> => {
                if (!__csrfSecret) {
                    const tokens = new CSRF
                    __csrfSecret = await tokens.secret()
                    const token = tokens.create(__csrfSecret)

                    /**
                     * Отсылаю csrf токен в cookie. Время жизни не устанавливаю, чтобы печенька
                     * была сессионной
                     */
                    reply.setCookie('__gf_csrf', token, {
                        domain: request.hostname,
                        httpOnly: true,
                        sameSite: true,
                        path: '/',
                        signed: true
                    })
                }
                return __csrfSecret
            }

            if (!['GET', 'OPTIONS', 'HEAD'].includes(request.method)) {
                const secret = (
                    request.headers.__gf_csrf
                    ?? request.query.__gf_csrf 
                    ?? request.body?.__gf_csrf
                )
                const token = (
                    request.cookies.__gf_csrf
                    ? request.unsignCookie(request.cookies.__gf_csrf)
                    : undefined
                )
                
                if (!secret || !token || !token.value || !token.valid) {
                    reply.code(419)
                    throw new InvalidCsrfToken
                }
                
                const tokens = new CSRF
                if (!tokens.verify(secret, token.value)) {
                    reply.code(419)
                    throw new InvalidCsrfToken
                }
            }
        })
    }, {
        name: 'gf-csrf',
        dependencies: ['fastify-cookie', 'gf-host-filter']
    })
}
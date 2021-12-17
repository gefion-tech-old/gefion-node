import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

export function getCacheNoStoreMiddlewarePlugin(): FastifyPluginAsync {
    return fp(async function(instance) {
        /**
         * Добавить ко всем ответам заголовок с отключением кеша
         */
        instance.addHook('onRequest', async (_, reply) => {
            reply.header('cache-control', 'no-store')
        })
    }, {
        name: 'gf-cache-no-store'
    })
}
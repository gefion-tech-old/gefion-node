import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'

export function getHostFilterMiddlewarePlugin(hostsFn: () => Promise<string[]>): FastifyPluginAsync {
    return fp(async function(instance) {
        instance.addHook('onRequest', async (request, reply) => {
            const hosts = await hostsFn()
            if (!hosts.includes(request.hostname)) {
                reply.callNotFound()
            }
        })
    }, {
        name: 'gf-host-filter'
    })
}
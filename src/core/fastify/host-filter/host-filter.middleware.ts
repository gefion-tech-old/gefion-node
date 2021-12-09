import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'

export function getHostFilterMiddlewarePlugin(options: {
    hosts: string[]
}): FastifyPluginAsync {
    return fp(async function(instance) {
        instance.addHook('onRequest', async (request, reply) => {
            if (!options.hosts.includes(request.hostname)) {
                reply.callNotFound()
            }
            return
        })
    })
}
import { interfaces } from 'inversify'
import { FastifyConfig, FASTIFY_SYMBOL } from './fastify.types'
import { FastifyPluginAsync } from 'fastify'

export async function getFastifyConfig(context: interfaces.Context): Promise<FastifyConfig> {
    const container = context.container

    let plugins: FastifyPluginAsync[] = []
    try {
        plugins = await Promise.all(
            container.getAll<Promise<FastifyPluginAsync>>(FASTIFY_SYMBOL.FastifyPlugin)
        )
    } catch {}

    return {
        plugins
    }
}
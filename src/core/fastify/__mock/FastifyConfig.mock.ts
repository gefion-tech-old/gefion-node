import { FastifyConfig } from '../fastify.types'
import { FastifyPluginAsync } from 'fastify'

export function getInitConfig(mock: {
    plugins: FastifyPluginAsync[]
}): () => Promise<FastifyConfig> {
    return async function(): Promise<FastifyConfig> {
        return {
            plugins: mock.plugins
        }
    }
}
import { FastifyConfig } from '../fastify.types'

export function getInitConfig(mock: Partial<FastifyConfig>): () => Promise<FastifyConfig> {
    return async function(): Promise<FastifyConfig> {
        return {
            plugins: mock.plugins ?? [],
            hosts: mock.hosts ?? [],
            secret: mock.secret ?? 'secret'
        }
    }
}
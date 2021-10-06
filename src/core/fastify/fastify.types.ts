import { 
    FastifyPluginAsync
} from 'fastify'

export const FASTIFY_SYMBOL = {
    FastifyService: Symbol('FastifyService'),
    FastifyConfig: Symbol('FastifyConfig'),
    FastifyPlugin: Symbol('FastifyPlugin')
}

export type FastifyConfig = {
    /**
     * Список плагинов
     */
    readonly plugins: FastifyPluginAsync[]
}
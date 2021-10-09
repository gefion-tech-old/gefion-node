import { 
    FastifyPluginAsync
} from 'fastify'

export const FASTIFY_SYMBOL = {
    FastifyService: Symbol('FastifyService'),
    FastifyConfig: Symbol('FastifyConfig'),
    FastifyPlugin: Symbol('FastifyPlugin'),
    FastifyInit: Symbol('FastifyInit')
}

export type FastifyConfig = {
    /**
     * Список плагинов
     */
    readonly plugins: FastifyPluginAsync[]
}
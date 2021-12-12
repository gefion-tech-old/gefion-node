import { 
    FastifyPluginAsync
} from 'fastify'

export const FASTIFY_SYMBOL = {
    FastifyService: Symbol('FastifyService'),
    FastifyConfig: Symbol('FastifyConfig'),
    FastifyPlugin: Symbol('FastifyPlugin'),
    FastifyInit: Symbol('FastifyInit'),
    DefaultPluginService: Symbol('DefaultPluginService')
}

export type FastifyConfig = {
    /**
     * Список плагинов
     */
    readonly plugins: FastifyPluginAsync[]
    /**
     * Секретный ключ для алгоритмов шифрования и хэширования
     */
    readonly secret: string
     /**
      * Список доменов на которых работает сайт (нужно для установки cookie и безопасности)
      */
    readonly hosts: string[]
}
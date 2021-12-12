import { injectable, inject } from 'inversify'
import { IFastifyService } from './fastify.interface'
import { FastifyInstance } from 'fastify'
import fastify from 'fastify'
import { FastifyConfig, FASTIFY_SYMBOL } from './fastify.types'
import uniqid from 'uniqid'
import { getHttpLogger } from '../../utils/logger'
import { 
    getLoggerErrorFormat,
    getHttpErrorFormat
} from '../../utils/error-format'

@injectable()
export class FastifyService implements IFastifyService {

    private __instance: FastifyInstance | undefined

    public constructor(
        @inject(FASTIFY_SYMBOL.FastifyConfig)
        private config: Promise<FastifyConfig>
    ) {}

    public async fastify(): Promise<FastifyInstance> {
        const config = await this.config

        if (this.__instance) {
            return this.__instance
        }

        const instance = this.__instance = fastify({
            /**
             * Генерировать более уникальный идентификатор чем по умолчанию
             */
            genReqId: function(): string {
                return uniqid()
            },

            /**
             * Приложение знает, что запросы на него проксируются
             */
            trustProxy: true,

            /**
             * Логгер. Логироваться будет каждый запрос
             */
            logger: getHttpLogger()
        })

        /**
         * Запуск всех плагинов
         */
        for (const plugin of config.plugins) {
            instance.register(plugin, {
                prefix: '/api'
            })
        }

        /**
         * Устанавливаю обработчик ошибок
         */
        instance.setErrorHandler(async function(error, request, reply): Promise<any> {
            if (reply.statusCode >= 400) {
                request.log.error(getLoggerErrorFormat(error), 'setErrorHandler')
                return getHttpErrorFormat(error)
            } else {
                request.log.info(getLoggerErrorFormat(error), 'setErrorHandler')
                return error
            }
        })

        /**
         * Запуск сервера. Все ошибки обрабатываются уровнем выше
         */
        await instance.listen(0)

        return this.__instance
    }

}
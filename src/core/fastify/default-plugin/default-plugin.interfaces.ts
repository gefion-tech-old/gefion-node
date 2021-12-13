import { FastifyInstance } from 'fastify'

export interface IDefaultPluginService {

    /**
     * Зарегистрировать в переданном экземпляре сервера плагин для работы с cookie
     * с настройками по умолчанию
     */
    registerCookiePlugin(instance: FastifyInstance): Promise<void>

    /**
     * Зарегистрировать в переданном экземпляре сервера плагин для добавления
     * промежуточного ПО для фильтрации запросов с неразрешёнными доменами
     */
    registerHostFilterMiddlewatePlugin(instance: FastifyInstance): Promise<void>

    /**
     * Зарегистрировать в переданном экземпляре сервера плагин для добавления
     * промежуточного ПО для работы с csrf токенами
     */
    registerCsrfMiddlewarePlugin(instance: FastifyInstance): Promise<void>

}
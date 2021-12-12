import { injectable, inject } from 'inversify'
import { FASTIFY_SYMBOL, FastifyConfig } from '../fastify.types'
import { IDefaultPluginService } from './default-plugin.interfaces'
import { getHostFilterMiddlewarePlugin } from '../host-filter/host-filter.middleware'
import cookie from 'fastify-cookie'
import { FastifyCookieOptions } from 'fastify-cookie'
import { FastifyInstance } from 'fastify'
import { getCsrfMiddlewarePlugin } from '../csrf/csrf.middleware'

@injectable()
export class DefaultPluginService implements IDefaultPluginService {

    public constructor(
        @inject(FASTIFY_SYMBOL.FastifyConfig)
        private config: Promise<FastifyConfig>
    ) {}

    public async registerCookiePlugin(instance: FastifyInstance): Promise<void> {
        const config = await this.config
        instance.register(cookie, {
            secret: config.secret
        } as FastifyCookieOptions)
    }

    public async registerHostFilterMiddlewatePlugin(instance: FastifyInstance): Promise<void> {
        const config = await this.config
        instance.register(getHostFilterMiddlewarePlugin({
            hosts: config.hosts
        }))
    }

    public async registerCsrfMiddlewarePlugin(instance: FastifyInstance): Promise<void> {
        instance.register(getCsrfMiddlewarePlugin())
    }

    public async registerDefaultPlugins(instance: FastifyInstance): Promise<void> {
        await Promise.all([
            this.registerCookiePlugin(instance),
            this.registerHostFilterMiddlewatePlugin(instance)
        ])
    }

}
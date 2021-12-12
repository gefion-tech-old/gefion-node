import { AsyncContainerModule, interfaces } from 'inversify'
import { FASTIFY_SYMBOL, FastifyConfig } from './fastify.types'
import { getFastifyConfig } from './fastify.config'
import { IFastifyService } from './fastify.interface'
import { FastifyService } from './fastify.service'
import { INIT_SYMBOL, InitRunner } from '../init/init.types'
import { InitFastify } from './fastify.init'
import { IDefaultPluginService } from './default-plugin/default-plugin.interfaces'
import { DefaultPluginService } from './default-plugin/default-plugin.service'

export const FastifyModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<Promise<FastifyConfig>>(FASTIFY_SYMBOL.FastifyConfig)
        .toDynamicValue(getFastifyConfig)
        .inSingletonScope()

    bind<IFastifyService>(FASTIFY_SYMBOL.FastifyService)
        .to(FastifyService)
        .inSingletonScope()

    bind<InitRunner>(INIT_SYMBOL.InitRunner)
        .to(InitFastify)
        .whenTargetNamed(FASTIFY_SYMBOL.FastifyInit)

    bind<IDefaultPluginService>(FASTIFY_SYMBOL.DefaultPluginService)
        .to(DefaultPluginService)
})
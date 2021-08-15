import { AsyncContainerModule, interfaces } from 'inversify'
import { INIT_SYMBOL, InitConfig } from './init.types'
import { IInitService } from './init.interface'
import { InitService } from './init.service'
import { getInitConfig } from './init.config'

export const InitModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<Promise<InitConfig>>(INIT_SYMBOL.InitConfig)
        .toDynamicValue(getInitConfig)
        .inSingletonScope()

    bind<IInitService>(INIT_SYMBOL.InitService)
        .to(InitService)
        .inSingletonScope()
})
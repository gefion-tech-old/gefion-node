import { AsyncContainerModule, interfaces } from 'inversify'
import { getConfigAppTypeormConnection } from './typeorm.config'
import { TYPEORM_SYMBOL, ConnectionConfig, ConnectionType } from './typeorm.types'
import { createConnection } from 'typeorm'

export const TypeOrmModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<Promise<ConnectionConfig>>(TYPEORM_SYMBOL.TypeOrmConnectionAppConfig)
        .toDynamicValue(getConfigAppTypeormConnection)
        .inSingletonScope()

    bind<Promise<ConnectionType>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        .toDynamicValue(async (context: interfaces.Context): Promise<ConnectionType> => {
            const container = context.container
            const config = await container
                .get<Promise<ConnectionConfig>>(TYPEORM_SYMBOL.TypeOrmConnectionAppConfig)
            const connection = await createConnection(config)
            return connection
        })
        .inSingletonScope()
})
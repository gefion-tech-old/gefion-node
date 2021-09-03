import { AsyncContainerModule, interfaces } from 'inversify'
import { getConfigAppTypeormConnection, getConfigTestConnection } from './typeorm.config'
import { TYPEORM_SYMBOL } from './typeorm.types'
import { createConnection, Connection, ConnectionOptions } from 'typeorm'

export const TypeOrmModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<Promise<ConnectionOptions>>(TYPEORM_SYMBOL.TypeOrmConnectionAppConfig)
        .toDynamicValue(
            process.env.NODE_ENV === 'test'
                ? getConfigTestConnection
                : getConfigAppTypeormConnection
        )
        .inSingletonScope()

    bind<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        .toDynamicValue(async (context: interfaces.Context): Promise<Connection> => {
            const container = context.container
            const config = await container
                .get<Promise<ConnectionOptions>>(TYPEORM_SYMBOL.TypeOrmConnectionAppConfig)
            const connection = await createConnection(config)
            return connection
        })
        .inSingletonScope()
})
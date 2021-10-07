import { AsyncContainerModule, interfaces } from 'inversify'
import { getConfigAppTypeormConnection, getConfigTestConnection } from './typeorm.config'
import { TYPEORM_SYMBOL } from './typeorm.types'
import { 
    createConnection, 
    Connection, 
    ConnectionOptions,
    getConnection
} from 'typeorm'

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

            /**
             * Специально ради тестов, если эта функия будет запускаться больше одного раза
             * (что невозможно без использования snapshot/restore из-за inSingletonScope),
             * то существующее соединение будет закрыто, а после заново открыто. Включенный
             * параметры dropSchema в такой ситуации может пересоздавать базу данных
             */
            let connection
            try {
                connection = await createConnection(config)
            } catch (error) {
                if ((error as any)?.name === 'AlreadyHasActiveConnectionError') {
                    /**
                     * Получить уже существующее соединение и имитировать ситуацию его запуска
                     * с нуля
                     */
                    connection = getConnection(config.name)
                    await connection.close()
                    await connection.connect()
                } else {
                    throw error
                }
            }

            return connection
        })
        .inSingletonScope()
})
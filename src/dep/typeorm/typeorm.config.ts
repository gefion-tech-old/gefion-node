import { interfaces } from 'inversify'
import { ConnectionConfig, EntityType, TYPEORM_SYMBOL } from './typeorm.types'

export async function getConfigAppTypeormConnection(context: interfaces.Context): Promise<ConnectionConfig> {
    const container = context.container
    let entities

    try {
        entities = container.getAll<EntityType>(TYPEORM_SYMBOL.TypeOrmEntity)
    } catch {}

    return {
        name: 'app',
        type: 'better-sqlite3',
        database: '/home/valentin/Документы/not_work/gefion/src/storage/database/app.sqlite',
        logging: 'all',
        synchronize: true,
        entities: entities
    }
}
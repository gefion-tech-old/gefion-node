import { interfaces } from 'inversify'
import { TYPEORM_SYMBOL } from './typeorm.types'
import { EntitySchema, ConnectionOptions } from 'typeorm'

export async function getConfigAppTypeormConnection(context: interfaces.Context): Promise<ConnectionOptions> {
    const container = context.container
    let entities

    try {
        entities = container.getAll<EntitySchema<any>>(TYPEORM_SYMBOL.TypeOrmEntity)
    } catch {}

    return {
        name: 'app',
        type: 'better-sqlite3',
        database: '/home/valentin/Документы/not_work/gefion/src/storage/database/app.sqlite',
        logging: 'all',
        synchronize: true,
        entities: entities,
        dropSchema: true
    }
}
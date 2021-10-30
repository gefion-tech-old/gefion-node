import { interfaces } from 'inversify'
import { TYPEORM_SYMBOL } from './typeorm.types'
import { EntitySchema, ConnectionOptions } from 'typeorm'
import { getTestEntities } from '../../utils/test-entities'

export async function getConfigAppTypeormConnection(context: interfaces.Context): Promise<ConnectionOptions> {
    const container = context.container

    let entities: EntitySchema<any>[] = []
    try {
        entities = container.getAll<EntitySchema<any>>(TYPEORM_SYMBOL.TypeOrmAppEntity)
    } catch {}

    return {
        name: 'app',
        type: 'better-sqlite3',
        database: '/home/valentin/Документы/not_work/gefion/src/storage/database/app.sqlite',
        logging: false,
        synchronize: true,
        entities: entities,
        dropSchema: true
    }
}

export async function getConfigTestConnection(context: interfaces.Context): Promise<ConnectionOptions> {
    const container = context.container
    
    let entities: EntitySchema<any>[] = []
    try {
        entities = container.getAll<EntitySchema<any>>(TYPEORM_SYMBOL.TypeOrmAppEntity)
    } catch {}

    return {
        name: 'app',
        type: 'better-sqlite3',
        database: '/home/valentin/Документы/not_work/gefion/src/storage/database/app.test.sqlite',
        logging: false,
        synchronize: true,
        entities: [...entities, ...getTestEntities()],
        dropSchema: true
    }
}
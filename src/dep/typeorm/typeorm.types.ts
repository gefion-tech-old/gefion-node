import { Connection, ConnectionOptions, EntitySchema } from 'typeorm'

export const TYPEORM_SYMBOL = {
    TypeOrmConnectionAppConfig: Symbol.for('TypeOrmConnectionConfigApp'),
    TypeOrmConnectionApp: Symbol.for('TypeOrmConnectionApp'),
    TypeOrmEntity: Symbol.for('TypeOrmEntity')
}

export type ConnectionType = Connection

export type ConnectionConfig = ConnectionOptions

export type EntityType = EntitySchema<any>
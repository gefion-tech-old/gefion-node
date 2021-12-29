import { injectable, inject } from 'inversify'
import { IRouteService } from './route.interface'
import { Connection, Repository } from 'typeorm'
import { 
    Route, 
    MiddlewareGroup, 
    Middleware, 
    RouteMiddlewareGroup, 
    RouteMiddleware 
} from '../entities/route.entity'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'
import { CreateRoute, RouteMetadata } from './route.types'
import {
    RoutePathAndMethodAlreadyExists,
    RouteDoesNotExists,
    RouteDoesNotHaveMiddleware,
    RouteDoesNotHaveMiddlewareGroup
} from './route.errors'
import { MiddlewareDoesNotExists } from './middleware/middleware.errors'
import { MiddlewareGroupDoesNotExists } from './middleware-group/middleware-group.errors'
import { transaction } from '../../../core/typeorm/utils/transaction'
import { mutationQuery } from '../../../core/typeorm/utils/mutation-query'
import { ICreatorService } from '../creator/creator.interface'
import { CREATOR_SYMBOL, ResourceType } from '../creator/creator.types'
import { SqliteErrorCode, isErrorCode } from '../../../core/typeorm/utils/error-code'
import { getCustomRepository } from '../../../core/typeorm/utils/custom-repository'
import { MetadataRepository } from '../metadata/repositories/metadata.repository'
import { SnapshotMetadata } from '../metadata/metadata.types'
import { Metadata } from '../entities/metadata.entity'

@injectable()
export class RouteService implements IRouteService {

    private connection: Promise<Connection>
    private routeRepository: Promise<Repository<Route>>

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        connection: Promise<Connection>,

        @inject(CREATOR_SYMBOL.CreatorService)
        private creatorService: ICreatorService
    ) {
        this.connection = connection
        this.routeRepository = connection.then(connection => {
            return connection.getRepository(Route)
        })
    }

    public async createIfNotExists(options: CreateRoute, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const routeRepository = await this.routeRepository

        if (await this.isExists(options.name)) {
            return
        }

        try {
            await transaction(nestedTransaction, connection, async () => {
                const routeEntity = await mutationQuery(true, () => {
                    return routeRepository.save({
                        isCsrf: false,
                        metadata: {
                            metadata: {
                                custom: null
                            }
                        },
                        method: options.method,
                        name: options.name,
                        path: options.path
                    })
                })
    
                await this.creatorService.bind({
                    type: ResourceType.Route,
                    id: routeEntity.id
                }, options.creator, true)
            })
        } catch(error) {
            if (isErrorCode(error, SqliteErrorCode.SQLITE_CONSTRAINT_UNIQUE)) {
                if ((error as any)?.message === 'SqliteError: UNIQUE constraint failed: route.method, route.path') {
                    throw new RoutePathAndMethodAlreadyExists
                }
            }

            throw error
        }
    }

    public async isExists(name: string): Promise<boolean> {
        const routeRepository = await this.routeRepository
        return await routeRepository.count({
            where: {
                name: name
            }
        }) > 0
    }

    public async setMetadata(name: string, snapshotMetadata: SnapshotMetadata<RouteMetadata>, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const metadataRepository = getCustomRepository(connection, MetadataRepository)
        const routeRepository = await this.routeRepository

        const routeEntity = await routeRepository.findOne({
            where: {
                name: name
            }
        })

        if (!routeEntity) {
            throw new RouteDoesNotExists
        }

        routeEntity.metadata.metadata.custom = snapshotMetadata.metadata.custom
        await metadataRepository.update(routeEntity.metadata.id, {
            metadata: routeEntity.metadata.metadata,
            revisionNumber: snapshotMetadata.revisionNumber
        }, nestedTransaction)
    }

    public async addMiddlewareGroup(routeName: string, groupName: string, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const routeRepository = await this.routeRepository
        const middlewareGroupRepository = connection.getRepository(MiddlewareGroup)

        const routeEntity = await routeRepository.findOne({
            where: {
                name: routeName
            }
        })

        if (!routeEntity) {
            throw new RouteDoesNotExists
        }

        const middlewareGroupEntity = await middlewareGroupRepository.findOne({
            where: {
                name: groupName
            }
        })

        if (!middlewareGroupEntity) {
            throw new MiddlewareGroupDoesNotExists
        }

        try {
            await mutationQuery(nestedTransaction, () => {
                return connection
                    .createQueryBuilder()
                    .relation(Route, 'middlewareGroups')
                    .of(routeEntity)
                    .add(middlewareGroupEntity)
            })
        } catch(error) {
            block: {
                if (isErrorCode(error, SqliteErrorCode.SQLITE_CONSTRAINT_PRIMARYKEY)) {
                    break block
                }

                throw error
            }
        }
    }

    public async removeMiddlewareGroup(routeName: string, groupName: string, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const routeRepository = await this.routeRepository
        const middlewareGroupRepository = connection.getRepository(MiddlewareGroup)

        const routeEntity = await routeRepository.findOne({
            where: {
                name: routeName
            }
        })

        if (!routeEntity) {
            throw new RouteDoesNotExists
        }

        const middlewareGroupEntity = await middlewareGroupRepository.findOne({
            where: {
                name: groupName
            }
        })

        if (!middlewareGroupEntity) {
            throw new MiddlewareGroupDoesNotExists
        }

        await mutationQuery(nestedTransaction, () => {
            return connection
                .createQueryBuilder()
                .relation(Route, 'middlewareGroups')
                .of(routeEntity)
                .remove(middlewareGroupEntity)
        })
    }

    public async setMiddlewareGroupSerialNumber(
        routeName: string, 
        groupName: string, 
        serialNumber: number, 
        nestedTransaction = false
    ): Promise<void> {
        const connection = await this.connection
        const routeRepository = await this.routeRepository
        const middlewareGroupRepository = connection.getRepository(MiddlewareGroup)
        const routeMiddlewareGroupRepository = connection.getRepository(RouteMiddlewareGroup)

        const routeEntity = await routeRepository.findOne({
            where: {
                name: routeName
            }
        })

        if (!routeEntity) {
            throw new RouteDoesNotExists
        }

        const middlewareGroupEntity = await middlewareGroupRepository.findOne({
            where: {
                name: groupName
            }
        })

        if (!middlewareGroupEntity) {
            throw new MiddlewareGroupDoesNotExists
        }

        const updateResult = await mutationQuery(nestedTransaction, () => {
            return routeMiddlewareGroupRepository.update({
                routeId: routeEntity.id,
                middlewareGroupId: middlewareGroupEntity.id
            }, {
                serialNumber: serialNumber
            })
        })

        if (updateResult.affected === 0) {
            throw new RouteDoesNotHaveMiddlewareGroup
        }
    }

    public async addMiddleware(routeName: string, middlewareName: string, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const routeRepository = await this.routeRepository
        const middlewareRepository = connection.getRepository(Middleware)

        const routeEntity = await routeRepository.findOne({
            where: {
                name: routeName
            }
        })

        if (!routeEntity) {
            throw new RouteDoesNotExists
        }

        const middlewareEntity = await middlewareRepository.findOne({
            where: {
                name: middlewareName
            }
        })

        if (!middlewareEntity) {
            throw new MiddlewareDoesNotExists
        }

        try {
            await mutationQuery(nestedTransaction, () => {
                return connection
                    .createQueryBuilder()
                    .relation(Route, 'middlewares')
                    .of(routeEntity)
                    .add(middlewareEntity)
            })
        } catch(error) {
            block: {
                if (isErrorCode(error, SqliteErrorCode.SQLITE_CONSTRAINT_PRIMARYKEY)) {
                    break block
                }

                throw error
            }
        }
    }

    public async removeMiddleware(routeName: string, middlewareName: string, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const routeRepository = await this.routeRepository
        const middlewareRepository = connection.getRepository(Middleware)

        const routeEntity = await routeRepository.findOne({
            where: {
                name: routeName
            }
        })

        if (!routeEntity) {
            throw new RouteDoesNotExists
        }

        const middlewareEntity = await middlewareRepository.findOne({
            where: {
                name: middlewareName
            }
        })

        if (!middlewareEntity) {
            throw new MiddlewareDoesNotExists
        }

        await mutationQuery(nestedTransaction, () => {
            return connection
                .createQueryBuilder()
                .relation(Route, 'middlewares')
                .of(routeEntity)
                .remove(middlewareEntity)
        })
    }

    public async setMiddlewareSerialNumber(
        routeName: string, 
        middlewareName: string, 
        serialNumber: number, 
        nestedTransaction = false
    ): Promise<void> {
        const connection = await this.connection
        const routeRepository = await this.routeRepository
        const middlewareRepository = connection.getRepository(Middleware)
        const routeMiddlewareRepository = connection.getRepository(RouteMiddleware)

        const routeEntity = await routeRepository.findOne({
            where: {
                name: routeName
            }
        })

        if (!routeEntity) {
            throw new RouteDoesNotExists
        }

        const middlewareEntity = await middlewareRepository.findOne({
            where: {
                name: middlewareName
            }
        })

        if (!middlewareEntity) {
            throw new MiddlewareDoesNotExists
        }

        const updateResult = await mutationQuery(nestedTransaction, () => {
            return routeMiddlewareRepository.update({
                routeId: routeEntity.id,
                middlewareId: middlewareEntity.id
            }, {
                serialNumber: serialNumber
            })
        })

        if (updateResult.affected === 0) {
            throw new RouteDoesNotHaveMiddleware
        }
    }

    public async enableCsrf(name: string, nestedTransaction = false): Promise<void> {
        const routeRepository = await this.routeRepository

        const updateResult = await mutationQuery(nestedTransaction, () => {
            return routeRepository.update({
                name: name
            }, {
                isCsrf: true
            })
        })

        if (updateResult.affected === 0) {
            throw new RouteDoesNotExists
        }
    }

    public async disableCsrf(name: string, nestedTransaction = false): Promise<void> {
        const routeRepository = await this.routeRepository

        const updateResult = await mutationQuery(nestedTransaction, () => {
            return routeRepository.update({
                name: name
            }, {
                isCsrf: false
            })
        })

        if (updateResult.affected === 0) {
            throw new RouteDoesNotExists
        }
    }

    public async remove(name: string, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const routeRepository = await this.routeRepository
        const metadataRepository = connection.getRepository(Metadata)

        const routeEntity = await routeRepository.findOne({
            where: {
                name: name
            }
        })

        if (!routeEntity) {
            return
        }

        await transaction(nestedTransaction, connection, async () => {
            await mutationQuery(true, () => {
                return routeRepository.remove(routeEntity)
            })

            await mutationQuery(true, () => {
                return metadataRepository.remove(routeEntity.metadata)
            })
        })
    }

}
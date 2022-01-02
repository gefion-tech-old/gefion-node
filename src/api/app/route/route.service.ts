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
import { CreateRoute, RouteMetadata, Route as RouteType } from './route.types'
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
import { Middleware as MiddlewareType } from './middleware/middleware.types'
import { MiddlewareGroup as MiddlewareGroupType } from './middleware-group/middleware-group.types'

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

        if (await this.isExists(options)) {
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
                        namespace: options.namespace,
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

    public async isExists(route: RouteType): Promise<boolean> {
        const routeRepository = await this.routeRepository
        return await routeRepository.count({
            where: {
                namespace: route.namespace,
                name: route.name
            }
        }) > 0
    }

    public async setMetadata(route: RouteType, snapshotMetadata: SnapshotMetadata<RouteMetadata>, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const metadataRepository = getCustomRepository(connection, MetadataRepository)
        const routeRepository = await this.routeRepository

        const routeEntity = await routeRepository.findOne({
            where: {
                namespace: route.namespace,
                name: route.name
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

    public async addMiddlewareGroup(route: RouteType, group: MiddlewareGroupType, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const routeRepository = await this.routeRepository
        const middlewareGroupRepository = connection.getRepository(MiddlewareGroup)

        const routeEntity = await routeRepository.findOne({
            where: {
                namespace: route.namespace,
                name: route.name
            }
        })

        if (!routeEntity) {
            throw new RouteDoesNotExists
        }

        const middlewareGroupEntity = await middlewareGroupRepository.findOne({
            where: {
                namespace: group.namespace,
                name: group.name
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

    public async removeMiddlewareGroup(route: RouteType, group: MiddlewareGroupType, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const routeRepository = await this.routeRepository
        const middlewareGroupRepository = connection.getRepository(MiddlewareGroup)

        const routeEntity = await routeRepository.findOne({
            where: {
                namespace: route.namespace,
                name: route.name
            }
        })

        if (!routeEntity) {
            throw new RouteDoesNotExists
        }

        const middlewareGroupEntity = await middlewareGroupRepository.findOne({
            where: {
                namespace: group.namespace,
                name: group.name
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
        route: RouteType, 
        group: MiddlewareGroupType, 
        serialNumber: number, 
        nestedTransaction = false
    ): Promise<void> {
        const connection = await this.connection
        const routeRepository = await this.routeRepository
        const middlewareGroupRepository = connection.getRepository(MiddlewareGroup)
        const routeMiddlewareGroupRepository = connection.getRepository(RouteMiddlewareGroup)

        const routeEntity = await routeRepository.findOne({
            where: {
                namespace: route.namespace,
                name: route.name
            }
        })

        if (!routeEntity) {
            throw new RouteDoesNotExists
        }

        const middlewareGroupEntity = await middlewareGroupRepository.findOne({
            where: {
                namespace: group.namespace,
                name: group.name
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

    public async addMiddleware(route: RouteType, middleware: MiddlewareType, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const routeRepository = await this.routeRepository
        const middlewareRepository = connection.getRepository(Middleware)

        const routeEntity = await routeRepository.findOne({
            where: {
                namespace: route.namespace,
                name: route.name
            }
        })

        if (!routeEntity) {
            throw new RouteDoesNotExists
        }

        const middlewareEntity = await middlewareRepository.findOne({
            where: {
                namespace: middleware.namespace,
                name: middleware.name
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

    public async removeMiddleware(route: RouteType, middleware: MiddlewareType, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const routeRepository = await this.routeRepository
        const middlewareRepository = connection.getRepository(Middleware)

        const routeEntity = await routeRepository.findOne({
            where: {
                namespace: route.namespace,
                name: route.name
            }
        })

        if (!routeEntity) {
            throw new RouteDoesNotExists
        }

        const middlewareEntity = await middlewareRepository.findOne({
            where: {
                namespace: middleware.namespace,
                name: middleware.name
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
        route: RouteType, 
        middleware: MiddlewareType, 
        serialNumber: number, 
        nestedTransaction = false
    ): Promise<void> {
        const connection = await this.connection
        const routeRepository = await this.routeRepository
        const middlewareRepository = connection.getRepository(Middleware)
        const routeMiddlewareRepository = connection.getRepository(RouteMiddleware)

        const routeEntity = await routeRepository.findOne({
            where: {
                namespace: route.namespace,
                name: route.name
            }
        })

        if (!routeEntity) {
            throw new RouteDoesNotExists
        }

        const middlewareEntity = await middlewareRepository.findOne({
            where: {
                namespace: middleware.namespace,
                name: middleware.name
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

    public async enableCsrf(route: RouteType, nestedTransaction = false): Promise<void> {
        const routeRepository = await this.routeRepository

        const updateResult = await mutationQuery(nestedTransaction, () => {
            return routeRepository.update({
                namespace: route.namespace,
                name: route.name
            }, {
                isCsrf: true
            })
        })

        if (updateResult.affected === 0) {
            throw new RouteDoesNotExists
        }
    }

    public async disableCsrf(route: RouteType, nestedTransaction = false): Promise<void> {
        const routeRepository = await this.routeRepository

        const updateResult = await mutationQuery(nestedTransaction, () => {
            return routeRepository.update({
                namespace: route.namespace,
                name: route.name
            }, {
                isCsrf: false
            })
        })

        if (updateResult.affected === 0) {
            throw new RouteDoesNotExists
        }
    }

    public async remove(route: RouteType, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const routeRepository = await this.routeRepository
        const metadataRepository = connection.getRepository(Metadata)

        const routeEntity = await routeRepository.findOne({
            where: {
                namespace: route.namespace,
                name: route.name
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
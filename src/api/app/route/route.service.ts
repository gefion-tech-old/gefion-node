import { injectable, inject } from 'inversify'
import { IRouteService } from './route.interface'
import { Connection } from 'typeorm'
import { 
    Route, 
    MiddlewareGroup, 
    Middleware, 
    RouteMiddlewareGroup, 
    RouteMiddleware,
    Controller
} from '../entities/route.entity'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'
import { 
    CreateRoute, 
    RouteMetadata, 
    Route as RouteType,
    EventContext,
    RouteEventMutationName,
    RouteEventMutation,
    RouteControllerMetadata,
    RouteMiddlewareMetadata
} from './route.types'
import {
    RoutePathAndMethodAlreadyExists,
    RouteDoesNotExists,
    RouteDoesNotHaveMiddleware,
    RouteDoesNotHaveMiddlewareGroup,
    RouteAlreadyExists,
    MiddlewareGroupAlreadyBound,
    MiddlewareAlreadyBound
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
import { ControllerDoesNotExists } from './controller/controller.errors'
import { Controller as ControllerType } from './controller/controller.types'
import { EventEmitter } from 'events'

@injectable()
export class RouteService implements IRouteService {

    private eventEmitter = new EventEmitter()

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        private connection: Promise<Connection>,

        @inject(CREATOR_SYMBOL.CreatorService)
        private creatorService: ICreatorService
    ) {}

    public async create(options: CreateRoute, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const routeRepository = connection.getRepository(Route)

        if (await this.isExists(options)) {
            throw new RouteAlreadyExists
        }

        const routeEntity = await transaction(nestedTransaction, connection, async () => {
            const routeEntity = await mutationQuery(true, async () => {
                try {
                    return await routeRepository.save({
                        isCsrf: false,
                        metadata: {
                            metadata: {
                                custom: null
                            }
                        },
                        controllerMetadata: {
                            metadata: {
                                custom: null
                            }
                        },
                        method: options.method,
                        name: options.name,
                        namespace: options.namespace,
                        path: options.path
                    })
                } catch(error) {
                    if (isErrorCode(error, SqliteErrorCode.SQLITE_CONSTRAINT_UNIQUE)) {
                        if ((error as any)?.message === 'SqliteError: UNIQUE constraint failed: route.method, route.path') {
                            throw new RoutePathAndMethodAlreadyExists
                        }
                    }
        
                    throw error
                }
            })

            await this.creatorService.bind({
                type: ResourceType.Route,
                id: routeEntity.id
            }, options.creator, true)

            return routeEntity
        })

        const eventContext: EventContext = {
            type: RouteEventMutation.Create,
            routeId: routeEntity.id
        }
        this.eventEmitter.emit(RouteEventMutationName, eventContext)
    }

    public async isExists(route: RouteType): Promise<boolean> {
        const connection = await this.connection
        const routeRepository = connection.getRepository(Route)

        return await routeRepository.count({
            where: {
                namespace: route.namespace,
                name: route.name
            }
        }) > 0
    }

    public async setMetadata(route: RouteType, snapshotMetadata: SnapshotMetadata<RouteMetadata>, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const routeRepository = connection.getRepository(Route)
        const metadataCustomRepository = getCustomRepository(connection, MetadataRepository)

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
        await metadataCustomRepository.update(routeEntity.metadata.id, {
            metadata: routeEntity.metadata.metadata,
            revisionNumber: snapshotMetadata.revisionNumber
        }, nestedTransaction)

        const eventContext: EventContext = {
            type: RouteEventMutation.SetMetadata,
            routeId: routeEntity.id
        }
        this.eventEmitter.emit(RouteEventMutationName, eventContext)
    }

    public async addMiddlewareGroup(route: RouteType, group: MiddlewareGroupType, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const routeRepository = connection.getRepository(Route)
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
            if (isErrorCode(error, SqliteErrorCode.SQLITE_CONSTRAINT_PRIMARYKEY)) {
                throw new MiddlewareGroupAlreadyBound
            }

            throw error
        }

        const eventContext: EventContext = {
            type: RouteEventMutation.AddMiddlewareGroup,
            routeId: routeEntity.id,
            middlewareGroupId: middlewareGroupEntity.id
        }
        this.eventEmitter.emit(RouteEventMutationName, eventContext)
    }

    public async removeMiddlewareGroup(route: RouteType, group: MiddlewareGroupType, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const routeRepository = connection.getRepository(Route)
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

        /**
         * Если связи с маршрутом изначально не было, то выйти из функции
         */
        if (!await routeMiddlewareGroupRepository.count({
            where: {
                routeId: routeEntity.id,
                middlewareGroupId: middlewareGroupEntity.id
            }
        })) {
            return
        }

        await mutationQuery(nestedTransaction, () => {
            return connection
                .createQueryBuilder()
                .relation(Route, 'middlewareGroups')
                .of(routeEntity)
                .remove(middlewareGroupEntity)
        })

        const eventContext: EventContext = {
            type: RouteEventMutation.RemoveMiddlewareGroup,
            routeId: routeEntity.id,
            middlewareGroupId: middlewareGroupEntity.id
        }
        this.eventEmitter.emit(RouteEventMutationName, eventContext)
    }

    public async setMiddlewareGroupSerialNumber(
        route: RouteType, 
        group: MiddlewareGroupType, 
        serialNumber: number, 
        nestedTransaction = false
    ): Promise<void> {
        const connection = await this.connection
        const routeRepository = connection.getRepository(Route)
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

        const eventContext: EventContext = {
            type: RouteEventMutation.SetMiddlewareGroupSerialNumber,
            routeId: routeEntity.id,
            middlewareGroupId: middlewareGroupEntity.id
        }
        this.eventEmitter.emit(RouteEventMutationName, eventContext)
    }

    public async addMiddleware(route: RouteType, middleware: MiddlewareType, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const routeRepository = connection.getRepository(Route)
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

        try {
            /**
             * Транзакция из-за каскадных запросов
             */
            await transaction(nestedTransaction, connection, async () => {
                await mutationQuery(true, () => {
                    return routeMiddlewareRepository.save({
                        routeId: routeEntity.id,
                        middlewareId: middlewareEntity.id,
                        metadata: {
                            metadata: {
                                custom: null
                            }
                        }
                    })
                })
            })
        } catch(error) {
            if (isErrorCode(error, SqliteErrorCode.SQLITE_CONSTRAINT_UNIQUE)) {
                throw new MiddlewareAlreadyBound
            }

            throw error
        }

        const eventContext: EventContext = {
            type: RouteEventMutation.AddMiddleware,
            routeId: routeEntity.id,
            middlewareId: middlewareEntity.id
        }
        this.eventEmitter.emit(RouteEventMutationName, eventContext)
    }

    public async removeMiddleware(route: RouteType, middleware: MiddlewareType, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const routeRepository = connection.getRepository(Route)
        const middlewareRepository = connection.getRepository(Middleware)
        const routeMiddlewareRepository = connection.getRepository(RouteMiddleware)
        const metadataRepository = connection.getRepository(Metadata)

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

        const routeMiddlewareEntity = await routeMiddlewareRepository.findOne({
            where: {
                routeId: routeEntity.id,
                middlewareId: middlewareEntity.id
            }
        })

        /**
         * Если связи с маршрутом изначально не было, то выйти из функции
         */
        if (!routeMiddlewareEntity) {
            return
        }


        await transaction(nestedTransaction, connection, async () => {
            await mutationQuery(true, () => {
                return routeMiddlewareRepository.remove(routeMiddlewareEntity)
            })

            await mutationQuery(true, () => {
                return metadataRepository.remove(routeMiddlewareEntity.metadata)
            })
        })

        const eventContext: EventContext = {
            type: RouteEventMutation.RemoveMiddleware,
            routeId: routeEntity.id,
            middlewareId: middlewareEntity.id
        }
        this.eventEmitter.emit(RouteEventMutationName, eventContext)
    }

    public async setRouteMiddlewareMetadata(
        route: Route,
        middleware: Middleware,
        snapshotMetadata: SnapshotMetadata<RouteMiddlewareMetadata>,
        nestedTransaction = false
    ): Promise<void> {
        const connection = await this.connection
        const routeRepository = connection.getRepository(Route)
        const middlewareRepository = connection.getRepository(Middleware)
        const routeMiddlewareRepository = connection.getRepository(RouteMiddleware)
        const metadataCustomRepository = getCustomRepository(connection, MetadataRepository)

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

        const routeMiddlewareEntity = await routeMiddlewareRepository.findOne({
            where: {
                routeId: routeEntity.id,
                middlewareId: middlewareEntity.id
            }
        })

        if (!routeMiddlewareEntity) {
            throw new RouteDoesNotHaveMiddleware
        }

        routeMiddlewareEntity.metadata.metadata.custom = snapshotMetadata.metadata.custom
        await metadataCustomRepository.update(routeMiddlewareEntity.metadata.id, {
            metadata: routeMiddlewareEntity.metadata.metadata,
            revisionNumber: snapshotMetadata.revisionNumber
        }, nestedTransaction)

        const eventContext: EventContext = {
            type: RouteEventMutation.SetRouteMiddlewareMetadata,
            routeId: routeEntity.id,
            middlewareId: middlewareEntity.id
        }
        this.eventEmitter.emit(RouteEventMutationName, eventContext)
    }

    public async setMiddlewareSerialNumber(
        route: RouteType, 
        middleware: MiddlewareType, 
        serialNumber: number, 
        nestedTransaction = false
    ): Promise<void> {
        const connection = await this.connection
        const routeRepository = connection.getRepository(Route)
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

        const eventContext: EventContext = {
            type: RouteEventMutation.SetMiddlewareSerialNumber,
            routeId: routeEntity.id,
            middlewareId: middlewareEntity.id
        }
        this.eventEmitter.emit(RouteEventMutationName, eventContext)
    }

    public async enableCsrf(route: RouteType, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const routeRepository = connection.getRepository(Route)

        const routeEntity = await routeRepository.findOne({
            where: {
                namespace: route.namespace,
                name: route.name
            }
        })

        if (!routeEntity) {
            throw new RouteDoesNotExists
        }

        await mutationQuery(nestedTransaction, () => {
            return routeRepository.update({
                namespace: route.namespace,
                name: route.name
            }, {
                isCsrf: true
            })
        })

        const eventContext: EventContext = {
            type: RouteEventMutation.EnableCsrf,
            routeId: routeEntity.id
        }
        this.eventEmitter.emit(RouteEventMutationName, eventContext)
    }

    public async disableCsrf(route: RouteType, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const routeRepository = connection.getRepository(Route)

        const routeEntity = await routeRepository.findOne({
            where: {
                namespace: route.namespace,
                name: route.name
            }
        })

        if (!routeEntity) {
            throw new RouteDoesNotExists
        }

        await mutationQuery(nestedTransaction, () => {
            return routeRepository.update({
                namespace: route.namespace,
                name: route.name
            }, {
                isCsrf: false
            })
        })

        const eventContext: EventContext = {
            type: RouteEventMutation.DisableCsrf,
            routeId: routeEntity.id
        }
        this.eventEmitter.emit(RouteEventMutationName, eventContext)
    }

    public async remove(route: RouteType, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const routeRepository = connection.getRepository(Route)
        const routeMiddlewareRepository = connection.getRepository(RouteMiddleware)
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

        /**
         * Идентификатор маршрута для события
         */
        const routeId = routeEntity.id

        await transaction(nestedTransaction, connection, async () => {
            /**
             * Получить список идентификаторов всех сущностей метаданных, которые нужно
             * удалить после удаления роли. Удалить раньше нельзя из-за RESTRICT ограничения
             */
            const metadataIds = [
                routeEntity.metadata.id,
                routeEntity.controllerMetadata.id,
                ...await routeMiddlewareRepository.find({
                    where: {
                        routeId: routeEntity.id
                    }
                }).then(routeMiddlewareEntities => {
                    return routeMiddlewareEntities.map(routeMiddlewareEntitie => {
                        return routeMiddlewareEntitie.metadataId
                    })
                })
            ]

            await mutationQuery(true, () => {
                return routeRepository.remove(routeEntity)
            })

            await mutationQuery(true, () => {
                return metadataRepository.delete(metadataIds)
            })
        })

        const eventContext: EventContext = {
            type: RouteEventMutation.Remove,
            routeId: routeId
        }
        this.eventEmitter.emit(RouteEventMutationName, eventContext)
    }

    public async bindController(route: RouteType, controller: ControllerType, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const routeRepository = connection.getRepository(Route)
        const controllerRepository = connection.getRepository(Controller)

        const routeEntity = await routeRepository.findOne({
            where: {
                namespace: route.namespace,
                name: route.name
            }
        })

        if (!routeEntity) {
            throw new RouteDoesNotExists()
        }

        const controllerEntity = await controllerRepository.findOne({
            where: {
                namespace: controller.namespace,
                name: controller.name
            }
        })

        if (!controllerEntity) {
            throw new ControllerDoesNotExists()
        }

        await mutationQuery(nestedTransaction, () => {
            return routeRepository.update({
                id: routeEntity.id
            }, {
                controllerId: controllerEntity.id
            })
        })

        const eventContext: EventContext = {
            type: RouteEventMutation.BindController,
            routeId: routeEntity.id,
            controllerId: controllerEntity.id
        }
        this.eventEmitter.emit(RouteEventMutationName, eventContext)
    }

    public async unbindController(route: RouteType, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const routeRepository = connection.getRepository(Route)

        const routeEntity = await routeRepository.findOne({
            where: {
                namespace: route.namespace,
                name: route.name
            }
        })

        if (!routeEntity) {
            throw new RouteDoesNotExists()
        }

        await mutationQuery(nestedTransaction, () => {
            return routeRepository.update({
                id: routeEntity.id
            }, {
                controllerId: null
            })
        })

        const eventContext: EventContext = {
            type: RouteEventMutation.UnbindController,
            routeId: routeEntity.id
        }
        this.eventEmitter.emit(RouteEventMutationName, eventContext)
    }

    public async setRouteControllerMetadata(
        route: Route, 
        snapshotMetadata: SnapshotMetadata<RouteControllerMetadata>,
        nestedTransaction = false
    ): Promise<void> {
        const connection = await this.connection
        const routeRepository = connection.getRepository(Route)
        const metadataCustomRepository = getCustomRepository(connection, MetadataRepository)

        const routeEntity = await routeRepository.findOne({
            where: {
                namespace: route.namespace,
                name: route.name
            }
        })

        if (!routeEntity) {
            throw new RouteDoesNotExists
        }

        routeEntity.controllerMetadata.metadata.custom = snapshotMetadata.metadata.custom
        await metadataCustomRepository.update(routeEntity.controllerMetadata.id, {
            metadata: routeEntity.controllerMetadata.metadata,
            revisionNumber: snapshotMetadata.revisionNumber
        }, nestedTransaction)

        const eventContext: EventContext = {
            type: RouteEventMutation.SetRouteControllerMetadata,
            routeId: routeEntity.id
        }
        this.eventEmitter.emit(RouteEventMutationName, eventContext)
    }

    public onMutation(handler: (context: EventContext) => void): void {
        this.eventEmitter.on(RouteEventMutationName, handler)
    }

}
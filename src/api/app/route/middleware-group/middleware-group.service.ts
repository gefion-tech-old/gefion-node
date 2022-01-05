import { injectable, inject } from 'inversify'
import { IMiddlewareGroupService } from './middleware-group.interface'
import { Connection } from 'typeorm'
import { TYPEORM_SYMBOL } from '../../../../core/typeorm/typeorm.types'
import { MiddlewareGroup, Middleware, MiddlewareGroupMiddleware } from '../../entities/route.entity'
import { 
    CreateMiddlewareGroup, 
    MiddlewareGroupMetadata,
    MiddlewareGroup as MiddlewareGroupType,
    EventContext,
    MiddlewareGroupEventMutation,
    MiddlewareGroupEventMutationName,
    MiddlewareGroupMiddlewareMetadata
} from './middleware-group.types'
import { getCustomRepository } from '../../../../core/typeorm/utils/custom-repository'
import { transaction } from '../../../../core/typeorm/utils/transaction'
import { mutationQuery } from '../../../../core/typeorm/utils/mutation-query'
import { SqliteErrorCode, isErrorCode } from '../../../../core/typeorm/utils/error-code'
import { MetadataRepository } from '../../metadata/repositories/metadata.repository'
import { SnapshotMetadata } from '../../metadata/metadata.types'
import { ICreatorService } from '../../creator/creator.interface'
import { ResourceType, CREATOR_SYMBOL } from '../../creator/creator.types'
import { 
    MiddlewareGroupDoesNotExists,
    MiddlewareGroupDoesNotHaveMiddleware,
    MiddlewareGroupAlreadyExists,
    MiddlewareAlreadyBound
} from './middleware-group.errors'
import { Metadata } from '../../entities/metadata.entity'
import { MiddlewareDoesNotExists } from '../middleware/middleware.errors'
import { Middleware as MiddlewareType } from '../middleware/middleware.types'
import { EventEmitter } from 'events'

@injectable()
export class MiddlewareGroupService implements IMiddlewareGroupService {

    private eventEmitter = new EventEmitter

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        private connection: Promise<Connection>,

        @inject(CREATOR_SYMBOL.CreatorService)
        private creatorService: ICreatorService
    ) {}

    public async create(options: CreateMiddlewareGroup, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const middlewareGroupRepository = connection.getRepository(MiddlewareGroup)

        if (await this.isExists(options)) {
            throw new MiddlewareGroupAlreadyExists
        }

        /**
         * Оборачиваю запрос в транзакцию в том числе из-за каскадного сохранения
         * метаданных
         */
        const middlewareGroupEntity = await transaction(nestedTransaction, connection, async () => {
            const middlewareGroupEntity = await mutationQuery(true, () => {
                return middlewareGroupRepository.save({
                    isCsrf: false,
                    isDefault: options.isDefault,
                    metadata: {
                        metadata: {
                            custom: null
                        }
                    },
                    name: options.name,
                    namespace: options.namespace
                })
            })

            await this.creatorService.bind({
                type: ResourceType.MiddlewareGroup,
                id: middlewareGroupEntity.id
            }, options.creator, true)

            return middlewareGroupEntity
        })

        const eventContext: EventContext = {
            type: MiddlewareGroupEventMutation.Create,
            middlewareGroupId: middlewareGroupEntity.id
        }
        this.eventEmitter.emit(MiddlewareGroupEventMutationName, eventContext)
    }

    public async isExists(group: MiddlewareGroupType): Promise<boolean> {
        const connection = await this.connection
        const middlewareGroupRepository = connection.getRepository(MiddlewareGroup)

        return await middlewareGroupRepository.count({
            where: {
                namespace: group.namespace,
                name: group.name
            }
        }) > 0
    }

    public async setMetadata(group: MiddlewareGroupType, snapshotMetadata: SnapshotMetadata<MiddlewareGroupMetadata>, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const middlewareGroupRepository = connection.getRepository(MiddlewareGroup)
        const metadataCustomRepository = getCustomRepository(connection, MetadataRepository)

        const middlewareGroupEntity = await middlewareGroupRepository.findOne({
            where: {
                namespace: group.namespace,
                name: group.name
            }
        })

        if (!middlewareGroupEntity) {
            throw new MiddlewareGroupDoesNotExists
        }

        middlewareGroupEntity.metadata.metadata.custom = snapshotMetadata.metadata.custom
        await metadataCustomRepository.update(middlewareGroupEntity.metadata.id, {
            metadata: middlewareGroupEntity.metadata.metadata,
            revisionNumber: snapshotMetadata.revisionNumber
        }, nestedTransaction)

        const eventContext: EventContext = {
            type: MiddlewareGroupEventMutation.SetMetadata,
            middlewareGroupId: middlewareGroupEntity.id
        }
        this.eventEmitter.emit(MiddlewareGroupEventMutationName, eventContext)
    }

    public async addMiddleware(group: MiddlewareGroupType, middleware: MiddlewareType, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const middlewareGroupRepository = connection.getRepository(MiddlewareGroup)
        const middlewareRepository = connection.getRepository(Middleware)
        const middlewareGroupMiddlewareRepository = connection.getRepository(MiddlewareGroupMiddleware)

        const middlewareGroupEntity = await middlewareGroupRepository.findOne({
            where: {
                namespace: group.namespace,
                name: group.name
            }
        })

        if (!middlewareGroupEntity) {
            throw new MiddlewareGroupDoesNotExists
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
                    return middlewareGroupMiddlewareRepository.save({
                        middlewareGroupId: middlewareGroupEntity.id,
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
            type: MiddlewareGroupEventMutation.AddMiddleware,
            middlewareGroupId: middlewareGroupEntity.id,
            middlewareId: middlewareEntity.id
        }
        this.eventEmitter.emit(MiddlewareGroupEventMutationName, eventContext)
    }

    public async removeMiddleware(group: MiddlewareGroupType, middleware: MiddlewareType, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const middlewareGroupRepository = connection.getRepository(MiddlewareGroup)
        const middlewareRepository = connection.getRepository(Middleware)
        const middlewareGroupMiddlewareRepository = connection.getRepository(MiddlewareGroupMiddleware)
        const metadataRepository = connection.getRepository(Metadata)

        const middlewareGroupEntity = await middlewareGroupRepository.findOne({
            where: {
                namespace: group.namespace,
                name: group.name
            }
        })

        if (!middlewareGroupEntity) {
            throw new MiddlewareGroupDoesNotExists
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

        const middlewareGroupMiddlewareEntity = await middlewareGroupMiddlewareRepository.findOne({
            where: {
                middlewareGroupId: middlewareGroupEntity.id,
                middlewareId: middlewareEntity.id
            }
        })

        /**
         * Если связи с группой изначально не было, то выйти из функции
         */
        if (!middlewareGroupMiddlewareEntity) {
            return
        }

        await transaction(nestedTransaction, connection, async () => {
            await mutationQuery(true, () => {
                return middlewareGroupMiddlewareRepository.remove(middlewareGroupMiddlewareEntity)
            })

            await mutationQuery(true, () => {
                return metadataRepository.remove(middlewareGroupMiddlewareEntity.metadata)
            })
        })

        const eventContext: EventContext = {
            type: MiddlewareGroupEventMutation.RemoveMiddleware,
            middlewareGroupId: middlewareGroupEntity.id,
            middlewareId: middlewareEntity.id
        }
        this.eventEmitter.emit(MiddlewareGroupEventMutationName, eventContext)
    }

    public async setMiddlewareGroupMiddlewareMetadata(
        group: MiddlewareGroup,
        middleware: Middleware,
        snapshotMetadata: SnapshotMetadata<MiddlewareGroupMiddlewareMetadata>,
        nestedTransaction?: boolean
    ): Promise<void> {
        const connection = await this.connection
        const middlewareGroupRepository = connection.getRepository(MiddlewareGroup)
        const middlewareRepository = connection.getRepository(Middleware)
        const middlewareGroupMiddlewareRepository = connection.getRepository(MiddlewareGroupMiddleware)
        const metadataCustomRepository = getCustomRepository(connection, MetadataRepository)

        const middlewareGroupEntity = await middlewareGroupRepository.findOne({
            where: {
                namespace: group.namespace,
                name: group.name
            }
        })

        if (!middlewareGroupEntity) {
            throw new MiddlewareGroupDoesNotExists
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

        const middlewareGroupMiddlewareEntity = await middlewareGroupMiddlewareRepository.findOne({
            where: {
                middlewareGroupId: middlewareGroupEntity.id,
                middlewareId: middlewareEntity.id
            }
        })

        if (!middlewareGroupMiddlewareEntity) {
            throw new MiddlewareGroupDoesNotHaveMiddleware
        }

        middlewareGroupMiddlewareEntity.metadata.metadata.custom = snapshotMetadata.metadata.custom
        await metadataCustomRepository.update(middlewareGroupMiddlewareEntity.metadata.id, {
            metadata: middlewareGroupMiddlewareEntity.metadata.metadata,
            revisionNumber: snapshotMetadata.revisionNumber
        }, nestedTransaction)

        const eventContext: EventContext = {
            type: MiddlewareGroupEventMutation.SetMiddlewareGroupMiddlewareMetadata,
            middlewareGroupId: middlewareGroupEntity.id,
            middlewareId: middlewareEntity.id
        }
        this.eventEmitter.emit(MiddlewareGroupEventMutationName, eventContext)
    }

    public async setMiddlewareSerialNumber(
        group: MiddlewareGroupType, 
        middleware: MiddlewareType, 
        serialNumber: number, 
        nestedTransaction = false
    ): Promise<void> {
        const connection = await this.connection
        const middlewareGroupRepository = connection.getRepository(MiddlewareGroup)
        const middlewareGroupMiddlewareRepository = connection.getRepository(MiddlewareGroupMiddleware)
        const middlewareRepository = connection.getRepository(Middleware)

        const middlewareGroupEntity = await middlewareGroupRepository.findOne({
            where: {
                namespace: group.namespace,
                name: group.name
            }
        })

        if (!middlewareGroupEntity) {
            throw new MiddlewareGroupDoesNotExists
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
            return middlewareGroupMiddlewareRepository.update({
                middlewareGroupId: middlewareGroupEntity.id,
                middlewareId: middlewareEntity.id
            }, {
                serialNumber: serialNumber
            })
        })

        if (updateResult.affected === 0) {
            throw new MiddlewareGroupDoesNotHaveMiddleware
        }

        const eventContext: EventContext = {
            type: MiddlewareGroupEventMutation.SetMiddlewareSerialNumber,
            middlewareGroupId: middlewareGroupEntity.id,
            middlewareId: middlewareEntity.id
        }
        this.eventEmitter.emit(MiddlewareGroupEventMutationName, eventContext)
    }

    public async remove(group: MiddlewareGroupType, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const middlewareGroupRepository = connection.getRepository(MiddlewareGroup)
        const metadataRepository = connection.getRepository(Metadata)
        const middlewareGroupMiddlewareRepository = connection.getRepository(MiddlewareGroupMiddleware)

        const middlewareGroupEntity = await middlewareGroupRepository.findOne({
            where: {
                namespace: group.namespace,
                name: group.name
            }
        })

        if (!middlewareGroupEntity) {
            return
        }

        /**
         * Идентификатор группы для события
         */
        const middlewareGroupId = middlewareGroupEntity.id

        await transaction(nestedTransaction, connection, async () => {
            /**
             * Получить список идентификаторов всех сущностей метаданных, которые нужно
             * удалить после удаления роли. Удалить раньше нельзя из-за RESTRICT ограничения
             */
            const metadataIds = [
                middlewareGroupEntity.metadata.id,
                ...await middlewareGroupMiddlewareRepository.find({
                    where: {
                        middlewareGroupId: middlewareGroupEntity.id
                    }
                }).then(middlewareGroupMiddlewareEntities => {
                    return middlewareGroupMiddlewareEntities.map(middlewareGroupMiddlewareEntitie => {
                        return middlewareGroupMiddlewareEntitie.metadataId
                    })
                })
            ]

            await mutationQuery(true, () => {
                return middlewareGroupRepository.remove(middlewareGroupEntity)
            })

            await mutationQuery(true, () => {
                return metadataRepository.delete(metadataIds)
            })
        })

        const eventContext: EventContext = {
            type: MiddlewareGroupEventMutation.Remove,
            middlewareGroupId: middlewareGroupId
        }
        this.eventEmitter.emit(MiddlewareGroupEventMutationName, eventContext)
    }

    public async enableCsrf(group: MiddlewareGroupType, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const middlewareGroupRepository = connection.getRepository(MiddlewareGroup)

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
            return middlewareGroupRepository.update({
                namespace: group.namespace,
                name: group.name
            }, {
                isCsrf: true
            })
        })

        const eventContext: EventContext = {
            type: MiddlewareGroupEventMutation.EnableCsrf,
            middlewareGroupId: middlewareGroupEntity.id
        }
        this.eventEmitter.emit(MiddlewareGroupEventMutationName, eventContext)
    }

    public async disableCsrf(group: MiddlewareGroupType, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const middlewareGroupRepository = connection.getRepository(MiddlewareGroup)

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
            return middlewareGroupRepository.update({
                namespace: group.namespace,
                name: group.name
            }, {
                isCsrf: false
            })
        })

        const eventContext: EventContext = {
            type: MiddlewareGroupEventMutation.DisableCsrf,
            middlewareGroupId: middlewareGroupEntity.id
        }
        this.eventEmitter.emit(MiddlewareGroupEventMutationName, eventContext)
    }

    public onMutation(handler: (context: EventContext) => void): void {
        this.eventEmitter.on(MiddlewareGroupEventMutationName, handler)
    }

}
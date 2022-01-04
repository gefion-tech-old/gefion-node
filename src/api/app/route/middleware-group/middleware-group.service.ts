import { injectable, inject } from 'inversify'
import { IMiddlewareGroupService } from './middleware-group.interface'
import { Connection, Repository } from 'typeorm'
import { TYPEORM_SYMBOL } from '../../../../core/typeorm/typeorm.types'
import { MiddlewareGroup, Middleware, MiddlewareGroupMiddleware } from '../../entities/route.entity'
import { 
    CreateMiddlewareGroup, 
    MiddlewareGroupMetadata,
    MiddlewareGroup as MiddlewareGroupType
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

@injectable()
export class MiddlewareGroupService implements IMiddlewareGroupService {

    private connection: Promise<Connection>
    private middlewareGroupRepository: Promise<Repository<MiddlewareGroup>>

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        connection: Promise<Connection>,

        @inject(CREATOR_SYMBOL.CreatorService)
        private creatorService: ICreatorService
    ) {
        this.connection = connection
        this.middlewareGroupRepository = connection.then(connection => {
            return connection.getRepository(MiddlewareGroup)
        })
    }

    public async create(options: CreateMiddlewareGroup, nestedTransaction = false): Promise<void> {
        const middlewareGroupRepository = await this.middlewareGroupRepository
        const connection = await this.connection

        if (await this.isExists(options)) {
            throw new MiddlewareGroupAlreadyExists
        }

        /**
         * Оборачиваю запрос в транзакцию в том числе из-за каскадного сохранения
         * метаданных
         */
        await transaction(nestedTransaction, connection, async () => {
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
        })
    }

    public async isExists(group: MiddlewareGroupType): Promise<boolean> {
        const middlewareGroupRepository = await this.middlewareGroupRepository
        return await middlewareGroupRepository.count({
            where: {
                namespace: group.namespace,
                name: group.name
            }
        }) > 0
    }

    public async setMetadata(group: MiddlewareGroupType, snapshotMetadata: SnapshotMetadata<MiddlewareGroupMetadata>, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const middlewareGroupRepository = await this.middlewareGroupRepository
        const metadataRepository = getCustomRepository(connection, MetadataRepository)

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
        await metadataRepository.update(middlewareGroupEntity.metadata.id, {
            metadata: middlewareGroupEntity.metadata.metadata,
            revisionNumber: snapshotMetadata.revisionNumber
        }, nestedTransaction)
    }

    public async addMiddleware(group: MiddlewareGroupType, middleware: MiddlewareType, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const middlewareGroupRepository = await this.middlewareGroupRepository
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

        try {
            await mutationQuery(nestedTransaction, () => {
                return connection
                    .createQueryBuilder()
                    .relation(MiddlewareGroup, 'middlewares')
                    .of(middlewareGroupEntity)
                    .add(middlewareEntity)
            })
        } catch(error) {
            if (isErrorCode(error, SqliteErrorCode.SQLITE_CONSTRAINT_PRIMARYKEY)) {
                throw new MiddlewareAlreadyBound
            }

            throw error
        }
    }

    public async removeMiddleware(group: MiddlewareGroupType, middleware: MiddlewareType, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const middlewareGroupRepository = await this.middlewareGroupRepository
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

        await mutationQuery(nestedTransaction, () => {
            return connection
                .createQueryBuilder()
                .relation(MiddlewareGroup, 'middlewares')
                .of(middlewareGroupEntity)
                .remove(middlewareEntity)
        })
    }

    public async setMiddlewareSerialNumber(
        group: MiddlewareGroupType, 
        middleware: MiddlewareType, 
        serialNumber: number, 
        nestedTransaction = false
    ): Promise<void> {
        const connection = await this.connection
        const middlewareGroupRepository = await this.middlewareGroupRepository
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
    }

    public async remove(group: MiddlewareGroupType, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const middlewareGroupRepository = await this.middlewareGroupRepository
        const metadataRepository = connection.getRepository(Metadata)

        const middlewareGroupEntity = await middlewareGroupRepository.findOne({
            where: {
                namespace: group.namespace,
                name: group.name
            }
        })

        if (!middlewareGroupEntity) {
            return
        }

        await transaction(nestedTransaction, connection, async () => {
            await mutationQuery(true, () => {
                return middlewareGroupRepository.remove(middlewareGroupEntity)
            })

            await mutationQuery(true, () => {
                return metadataRepository.remove(middlewareGroupEntity.metadata)
            })
        })
    }

    public async enableCsrf(group: MiddlewareGroupType, nestedTransaction = false): Promise<void> {
        const middlewareGroupRepository = await this.middlewareGroupRepository

        const updateResult = await mutationQuery(nestedTransaction, () => {
            return middlewareGroupRepository.update({
                namespace: group.namespace,
                name: group.name
            }, {
                isCsrf: true
            })
        })

        if (updateResult.affected === 0) {
            throw new MiddlewareGroupDoesNotExists
        }
    }

    public async disableCsrf(group: MiddlewareGroupType, nestedTransaction = false): Promise<void> {
        const middlewareGroupRepository = await this.middlewareGroupRepository

        const updateResult = await mutationQuery(nestedTransaction, () => {
            return middlewareGroupRepository.update({
                namespace: group.namespace,
                name: group.name
            }, {
                isCsrf: false
            })
        })

        if (updateResult.affected === 0) {
            throw new MiddlewareGroupDoesNotExists
        }
    }

}
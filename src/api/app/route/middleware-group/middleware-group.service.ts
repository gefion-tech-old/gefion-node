import { injectable, inject } from 'inversify'
import { IMiddlewareGroupService } from './middleware-group.interface'
import { Connection, Repository } from 'typeorm'
import { TYPEORM_SYMBOL } from '../../../../core/typeorm/typeorm.types'
import { MiddlewareGroup, Middleware } from '../../entities/route.entity'
import { CreateMiddlewareGroup, MiddlewareGroupMetadata } from './middleware-group.types'
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
} from './middleware-group.errors'
import { Metadata } from '../../entities/metadata.entity'
import { MiddlewareDoesNotExists } from '../middleware/middleware.errors'

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

    public async createIfNotExists(options: CreateMiddlewareGroup, nestedTransaction = false): Promise<void> {
        const middlewareGroupRepository = await this.middlewareGroupRepository
        const connection = await this.connection

        if (await this.isExists(options.name)) {
            return
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
                    name: options.name
                })
            })

            await this.creatorService.bind({
                type: ResourceType.MiddlewareGroup,
                id: middlewareGroupEntity.id
            }, options.creator, true)
        })
    }

    public async isExists(name: string): Promise<boolean> {
        const middlewareGroupRepository = await this.middlewareGroupRepository
        return await middlewareGroupRepository.count({
            where: {
                name: name
            }
        }) > 0
    }

    public async setMetadata(name: string, snapshotMetadata: SnapshotMetadata<MiddlewareGroupMetadata>, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const middlewareGroupRepository = await this.middlewareGroupRepository
        const metadataRepository = getCustomRepository(connection, MetadataRepository)

        const middlewareGroupEntity = await middlewareGroupRepository.findOne({
            where: {
                name: name
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

    public async addMiddleware(groupName: string, middlewareName: string, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const middlewareGroupRepository = await this.middlewareGroupRepository
        const middlewareRepository = connection.getRepository(Middleware)

        const middlewareGroupEntity = await middlewareGroupRepository.findOne({
            where: {
                name: groupName
            }
        })

        if (!middlewareGroupEntity) {
            throw new MiddlewareGroupDoesNotExists
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
                    .relation(MiddlewareGroup, 'middlewares')
                    .of(middlewareGroupEntity)
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

    public async removeMiddleware(groupName: string, middlewareName: string, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const middlewareGroupRepository = await this.middlewareGroupRepository
        const middlewareRepository = connection.getRepository(Middleware)

        const middlewareGroupEntity = await middlewareGroupRepository.findOne({
            where: {
                name: groupName
            }
        })

        if (!middlewareGroupEntity) {
            throw new MiddlewareGroupDoesNotExists
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
                .relation(MiddlewareGroup, 'middlewares')
                .of(middlewareGroupEntity)
                .remove(middlewareEntity)
        })
    }

    public async remove(name: string, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const middlewareGroupRepository = await this.middlewareGroupRepository
        const metadataRepository = connection.getRepository(Metadata)

        const middlewareGroupEntity = await middlewareGroupRepository.findOne({
            where: {
                name: name
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

    public async enableCsrf(name: string, nestedTransaction = false): Promise<void> {
        const middlewareGroupRepository = await this.middlewareGroupRepository

        const updateResult = await mutationQuery(nestedTransaction, () => {
            return middlewareGroupRepository.update({
                name: name
            }, {
                isCsrf: true
            })
        })

        if (updateResult.affected === 0) {
            throw new MiddlewareGroupDoesNotExists
        }
    }

    public async disableCsrf(name: string, nestedTransaction = false): Promise<void> {
        const middlewareGroupRepository = await this.middlewareGroupRepository

        const updateResult = await mutationQuery(nestedTransaction, () => {
            return middlewareGroupRepository.update({
                name: name
            }, {
                isCsrf: false
            })
        })

        if (updateResult.affected === 0) {
            throw new MiddlewareGroupDoesNotExists
        }
    }

}
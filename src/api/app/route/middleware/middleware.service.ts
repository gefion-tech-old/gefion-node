import { injectable, inject } from 'inversify'
import { IMiddlewareService } from './middleware.interface'
import { TYPEORM_SYMBOL } from '../../../../core/typeorm/typeorm.types'
import { getCustomRepository } from '../../../../core/typeorm/utils/custom-repository'
import { transaction } from '../../../../core/typeorm/utils/transaction'
import { mutationQuery } from '../../../../core/typeorm/utils/mutation-query'
import { IMethodService } from '../../method/method.interface'
import { METHOD_SYMBOL } from '../../method/method.types'
import { Connection, Repository } from 'typeorm'
import { Middleware } from '../../entities/route.entity'
import { CREATOR_SYMBOL, ResourceType } from '../../creator/creator.types'
import { ICreatorService } from '../../creator/creator.interface'
import { 
    CreateMiddleware, 
    MiddlewareMetadata, 
    Middleware as MiddlewareType 
} from './middleware.types'
import { SnapshotMetadata } from '../../metadata/metadata.types'
import { MetadataRepository } from '../../metadata/repositories/metadata.repository'
import {
    MiddlewareMethodNotDefined,
    MiddlewareDoesNotExists,
    MiddlewareAlreadyExists
} from './middleware.errors'
import { Metadata } from '../../entities/metadata.entity'
import { MethodUsedError } from '../../method/method.errors'

@injectable()
export class MiddlewareService implements IMiddlewareService {

    private connection: Promise<Connection>
    private middlewareRepository: Promise<Repository<Middleware>>

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        connection: Promise<Connection>,

        @inject(METHOD_SYMBOL.MethodService)
        private methodService: IMethodService,

        @inject(CREATOR_SYMBOL.CreatorService)
        private creatorService: ICreatorService
    ) {
        this.connection = connection
        this.middlewareRepository = connection.then(connection => {
            return connection.getRepository(Middleware)
        })
    }

    public async create(options: CreateMiddleware, nestedTransaction = false): Promise<void> {
        const middlewareRepository = await this.middlewareRepository
        const connection = await this.connection

        if (await this.isExists(options)) {
            throw new MiddlewareAlreadyExists
        }

        const methodId = await this.methodService.getMethodId(options.method)

        if (!methodId) {
            throw new MiddlewareMethodNotDefined
        }

        /**
         * Оборачиваю запрос в транзакцию в том числе из-за каскадного сохранения
         * метаданных
         */
        await transaction(nestedTransaction, connection, async () => {
            const middlewareEntity = await mutationQuery(true, () => {
                return middlewareRepository.save({
                    isCsrf: false,
                    method: { id: methodId },
                    name: options.name,
                    namespace: options.namespace,
                    metadata: {
                        metadata: {
                            custom: null
                        }
                    }
                })
            })

            await this.creatorService.bind({
                type: ResourceType.Middleware,
                id: middlewareEntity.id
            }, options.creator, true)
        })
    }

    public async isExists(middleware: MiddlewareType): Promise<boolean> {
        const middlewareRepository = await this.middlewareRepository
        return await middlewareRepository.count({
            where: {
                namespace: middleware.namespace,
                name: middleware.name
            }
        }) > 0
    }

    public async setMetadata(middleware: MiddlewareType, snapshotMetadata: SnapshotMetadata<MiddlewareMetadata>, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const middlewareRepository = await this.middlewareRepository
        const metadataRepository = getCustomRepository(connection, MetadataRepository)

        const middlewareEntity = await middlewareRepository.findOne({
            where: {
                namespace: middleware.namespace,
                name: middleware.name
            }
        })

        if (!middlewareEntity) {
            throw new MiddlewareDoesNotExists
        }

        middlewareEntity.metadata.metadata.custom = snapshotMetadata.metadata.custom
        await metadataRepository.update(middlewareEntity.metadata.id, {
            metadata: middlewareEntity.metadata.metadata,
            revisionNumber: snapshotMetadata.revisionNumber
        }, nestedTransaction)
    }

    public async remove(middleware: MiddlewareType, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const middlewareRepository = await this.middlewareRepository
        const metadataRepository = connection.getRepository(Metadata)

        const middlewareEntity = await middlewareRepository.findOne({
            where: {
                namespace: middleware.namespace,
                name: middleware.name
            },
            relations: ['method']
        })

        if (!middlewareEntity) {
            return
        }

        await transaction(nestedTransaction, connection, async () => {
            await mutationQuery(true, () => {
                return middlewareRepository.remove(middlewareEntity)
            })

            await mutationQuery(true, () => {
                return metadataRepository.remove(middlewareEntity.metadata)
            })

            /**
             * Попытаться удалить метод контроллера, если он не используется
             */
            try {
                await this.methodService.removeMethod(middlewareEntity.method, true)
            } catch(error) {
                block: {
                    if (error instanceof MethodUsedError) {
                        break block
                    }

                    throw error
                }
            }
        })
    }

    public async enableCsrf(middleware: MiddlewareType, nestedTransaction = false): Promise<void> {
        const middlewareRepository = await this.middlewareRepository

        const updateResult = await mutationQuery(nestedTransaction, () => {
            return middlewareRepository.update({
                namespace: middleware.namespace,
                name: middleware.name
            }, {
                isCsrf: true
            })
        })

        if (updateResult.affected === 0) {
            throw new MiddlewareDoesNotExists
        }
    }

    public async disableCsrf(middleware: MiddlewareType, nestedTransaction = false): Promise<void> {
        const middlewareRepository = await this.middlewareRepository

        const updateResult = await mutationQuery(nestedTransaction, () => {
            return middlewareRepository.update({
                namespace: middleware.namespace,
                name: middleware.name
            }, {
                isCsrf: false
            })
        })

        if (updateResult.affected === 0) {
            throw new MiddlewareDoesNotExists
        }
    }

}
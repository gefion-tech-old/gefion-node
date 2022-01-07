import { injectable, inject } from 'inversify'
import { IFilterService } from './filter.interface'
import {
    CreateFilter,
    EventContext,
    Filter,
    FilterEventMutation,
    FilterEventMutationName,
    FilterMetadata
} from './filter.types'
import {
    FilterAlreadyExists,
    FilterDoesNotExists,
    FilterMethodNotDefined
} from './filter.errors'
import { Connection } from 'typeorm'
import { TYPEORM_SYMBOL } from '../../../../core/typeorm/typeorm.types'
import { mutationQuery } from '../../../../core/typeorm/utils/mutation-query'
import { transaction } from '../../../../core/typeorm/utils/transaction'
import { getCustomRepository } from '../../../../core/typeorm/utils/custom-repository'
import { MetadataRepository } from '../../metadata/repositories/metadata.repository'
import { METHOD_SYMBOL } from '../../method/method.types'
import { IMethodService } from '../../method/method.interface'
import { EventEmitter } from 'events'
import { Filter as FilterEntity } from '../../entities/signal.entity'
import { CREATOR_SYMBOL, ResourceType } from '../../creator/creator.types'
import { ICreatorService } from '../../creator/creator.interface'
import { SnapshotMetadata } from '../../metadata/metadata.types'
import { Metadata } from '../../entities/metadata.entity'
import { MethodUsedError } from '../../method/method.errors'

@injectable()
export class FilterService implements IFilterService {

    private eventEmitter = new EventEmitter

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        private connection: Promise<Connection>,

        @inject(METHOD_SYMBOL.MethodService)
        private methodService: IMethodService,

        @inject(CREATOR_SYMBOL.CreatorService)
        private creatorService: ICreatorService
    ) {}

    public async create(options: CreateFilter, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const filterRepository = connection.getRepository(FilterEntity)

        if (await this.isExists(options)) {
            throw new FilterAlreadyExists
        }

        const methodId = await this.methodService.getMethodId(options.method)

        if (!methodId) {
            throw new FilterMethodNotDefined
        }

        const filterEntity = await transaction(nestedTransaction, connection, async () => {
            const filterEntity = await mutationQuery(true, () => {
                return filterRepository.save({
                    name: options.name,
                    namespace: options.namespace,
                    metadata: {
                        metadata: {
                            custom: null
                        }
                    },
                    method: { id: methodId }
                })
            })

            await this.creatorService.bind({
                type: ResourceType.Filter,
                id: filterEntity.id
            }, options.creator, true)

            return filterEntity
        })

        const eventContext: EventContext = {
            type: FilterEventMutation.Create,
            filterId: filterEntity.id
        }
        this.eventEmitter.emit(FilterEventMutationName, eventContext)
    }

    public async isExists(filter: Filter): Promise<boolean> {
        const connection = await this.connection
        const filterRepository = connection.getRepository(FilterEntity)

        return await filterRepository.count({
            where: {
                namespace: filter.namespace,
                name: filter.name
            }
        }) > 0
    }

    public async setMetadata(filter: Filter, snapshotMetadata: SnapshotMetadata<FilterMetadata>, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const filterRepository = connection.getRepository(FilterEntity)
        const metadataCustomRepository = getCustomRepository(connection, MetadataRepository)

        const filterEntity = await filterRepository.findOne({
            where: {
                namespace: filter.namespace,
                name: filter.name
            }
        })

        if (!filterEntity) {
            throw new FilterDoesNotExists
        }

        filterEntity.metadata.metadata.custom = snapshotMetadata.metadata.custom
        await metadataCustomRepository.update(filterEntity.metadata.id, {
            metadata: filterEntity.metadata.metadata,
            revisionNumber: snapshotMetadata.revisionNumber
        }, nestedTransaction)

        const eventContext: EventContext = {
            type: FilterEventMutation.SetMetadata,
            filterId: filterEntity.id
        }
        this.eventEmitter.emit(FilterEventMutationName, eventContext)
    }

    public async remove(filter: Filter, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const filterRepository = connection.getRepository(FilterEntity)
        const metadataRepository = connection.getRepository(Metadata)

        const filterEntity = await filterRepository.findOne({
            where: {
                namespace: filter.namespace,
                name: filter.name
            },
            relations: ['method']
        })

        /**
         * Выйти из метода, если ресурса и так не существовало
         */
        if (!filterEntity) {
            return
        }

        /**
         * Идентификатор для события
         */
        const filterId = filterEntity.id

        await transaction(nestedTransaction, connection, async () => {
            await mutationQuery(true, () => {
                return filterRepository.remove(filterEntity)
            })

            await mutationQuery(true, () => {
                return metadataRepository.remove(filterEntity.metadata)
            })

            /**
             * Попытаться удалить метод охранника, если он не используется
             */
            try {
                await this.methodService.removeMethod(filterEntity.method, true)
            } catch(error) {
                block: {
                    if (error instanceof MethodUsedError) {
                        break block
                    }

                    throw error
                }
            }
        })

        const eventContext: EventContext = {
            type: FilterEventMutation.Remove,
            filterId: filterId
        }
        this.eventEmitter.emit(FilterEventMutationName, eventContext)
    }

    public onMutation(handler: (context: EventContext) => void): void {
        this.eventEmitter.on(FilterEventMutationName, handler)
    }

}
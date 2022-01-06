import { injectable, inject } from 'inversify'
import { IGuardService } from './guard.interface'
import {
    CreateGuard,
    EventContext,
    Guard,
    GuardEventMutation,
    GuardEventMutationName,
    GuardMetadata
} from './guard.types'
import {
    GuardAlreadyExists,
    GuardDoesNotExists,
    GuardMethodNotDefined
} from './guard.errors'
import { Connection } from 'typeorm'
import { TYPEORM_SYMBOL } from '../../../../core/typeorm/typeorm.types'
import { mutationQuery } from '../../../../core/typeorm/utils/mutation-query'
import { transaction } from '../../../../core/typeorm/utils/transaction'
import { getCustomRepository } from '../../../../core/typeorm/utils/custom-repository'
import { MetadataRepository } from '../../metadata/repositories/metadata.repository'
import { METHOD_SYMBOL } from '../../method/method.types'
import { IMethodService } from '../../method/method.interface'
import { EventEmitter } from 'events'
import { Guard as GuardEntity } from '../../entities/signal.entity'
import { CREATOR_SYMBOL, ResourceType } from '../../creator/creator.types'
import { ICreatorService } from '../../creator/creator.interface'
import { SnapshotMetadata } from '../../metadata/metadata.types'
import { Metadata } from '../../entities/metadata.entity'
import { MethodUsedError } from '../../method/method.errors'

@injectable()
export class GuardService implements IGuardService {

    private eventEmitter = new EventEmitter

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        private connection: Promise<Connection>,

        @inject(METHOD_SYMBOL.MethodService)
        private methodService: IMethodService,

        @inject(CREATOR_SYMBOL.CreatorService)
        private creatorService: ICreatorService
    ) {}

    public async create(options: CreateGuard, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const guardRepository = connection.getRepository(GuardEntity)

        if (await this.isExists(options)) {
            throw new GuardAlreadyExists
        }

        const methodId = await this.methodService.getMethodId(options.method)

        if (!methodId) {
            throw new GuardMethodNotDefined
        }

        const guardEntity = await transaction(nestedTransaction, connection, async () => {
            const guardEntity = await mutationQuery(true, () => {
                return guardRepository.save({
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
                type: ResourceType.Guard,
                id: guardEntity.id
            }, options.creator, true)

            return guardEntity
        })

        const eventContext: EventContext = {
            type: GuardEventMutation.Create,
            guardId: guardEntity.id
        }
        this.eventEmitter.emit(GuardEventMutationName, eventContext)
    }

    public async isExists(guard: Guard): Promise<boolean> {
        const connection = await this.connection
        const guardRepository = connection.getRepository(GuardEntity)

        return await guardRepository.count({
            where: {
                namespace: guard.namespace,
                name: guard.name
            }
        }) > 0
    }

    public async setMetadata(guard: Guard, snapshotMetadata: SnapshotMetadata<GuardMetadata>, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const guardRepository = connection.getRepository(GuardEntity)
        const metadataCustomRepository = getCustomRepository(connection, MetadataRepository)

        const guardEntity = await guardRepository.findOne({
            where: {
                namespace: guard.namespace,
                name: guard.name
            }
        })

        if (!guardEntity) {
            throw new GuardDoesNotExists
        }

        guardEntity.metadata.metadata.custom = snapshotMetadata.metadata.custom
        await metadataCustomRepository.update(guardEntity.metadata.id, {
            metadata: guardEntity.metadata.metadata,
            revisionNumber: snapshotMetadata.revisionNumber
        }, nestedTransaction)

        const eventContext: EventContext = {
            type: GuardEventMutation.SetMetadata,
            guardId: guardEntity.id
        }
        this.eventEmitter.emit(GuardEventMutationName, eventContext)
    }

    public async remove(guard: Guard, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const guardRepository = connection.getRepository(GuardEntity)
        const metadataRepository = connection.getRepository(Metadata)

        const guardEntity = await guardRepository.findOne({
            where: {
                namespace: guard.namespace,
                name: guard.name
            },
            relations: ['method']
        })

        /**
         * Выйти из метода, если ресурса и так не существовало
         */
        if (!guardEntity) {
            return
        }

        /**
         * Идентификатор для события
         */
        const guardId = guardEntity.id

        await transaction(nestedTransaction, connection, async () => {
            await mutationQuery(true, () => {
                return guardRepository.remove(guardEntity)
            })

            await mutationQuery(true, () => {
                return metadataRepository.remove(guardEntity.metadata)
            })

            /**
             * Попытаться удалить метод охранника, если он не используется
             */
            try {
                await this.methodService.removeMethod(guardEntity.method, true)
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
            type: GuardEventMutation.Remove,
            guardId: guardId
        }
        this.eventEmitter.emit(GuardEventMutationName, eventContext)
    }

    public onMutation(handler: (context: EventContext) => void): void {
        this.eventEmitter.on(GuardEventMutationName, handler)
    }

}
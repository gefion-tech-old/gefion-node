import { injectable, inject } from 'inversify'
import { IValidatorService } from './validator.interface'
import {
    CreateValidator,
    EventContext,
    Validator,
    ValidatorEventMutation,
    ValidatorEventMutationName,
    ValidatorMetadata
} from './validator.types'
import {
    ValidatorAlreadyExists,
    ValidatorDoesNotExists,
    ValidatorMethodNotDefined
} from './validator.errors'
import { Connection } from 'typeorm'
import { TYPEORM_SYMBOL } from '../../../../core/typeorm/typeorm.types'
import { mutationQuery } from '../../../../core/typeorm/utils/mutation-query'
import { transaction } from '../../../../core/typeorm/utils/transaction'
import { getCustomRepository } from '../../../../core/typeorm/utils/custom-repository'
import { MetadataRepository } from '../../metadata/repositories/metadata.repository'
import { METHOD_SYMBOL } from '../../method/method.types'
import { IMethodService } from '../../method/method.interface'
import { EventEmitter } from 'events'
import { Validator as ValidatorEntity } from '../../entities/signal.entity'
import { CREATOR_SYMBOL, ResourceType } from '../../creator/creator.types'
import { ICreatorService } from '../../creator/creator.interface'
import { SnapshotMetadata } from '../../metadata/metadata.types'
import { Metadata } from '../../entities/metadata.entity'
import { MethodUsedError } from '../../method/method.errors'

@injectable()
export class ValidatorService implements IValidatorService {

    private eventEmitter = new EventEmitter

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        private connection: Promise<Connection>,

        @inject(METHOD_SYMBOL.MethodService)
        private methodService: IMethodService,

        @inject(CREATOR_SYMBOL.CreatorService)
        private creatorService: ICreatorService
    ) {}

    public async create(options: CreateValidator, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const validatorRepository = connection.getRepository(ValidatorEntity)

        if (await this.isExists(options)) {
            throw new ValidatorAlreadyExists
        }

        const methodId = await this.methodService.getMethodId(options.method)

        if (!methodId) {
            throw new ValidatorMethodNotDefined
        }

        const validatorEntity = await transaction(nestedTransaction, connection, async () => {
            const validatorEntity = await mutationQuery(true, () => {
                return validatorRepository.save({
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
                type: ResourceType.Validator,
                id: validatorEntity.id
            }, options.creator, true)

            return validatorEntity
        })

        const eventContext: EventContext = {
            type: ValidatorEventMutation.Create,
            validatorId: validatorEntity.id
        }
        this.eventEmitter.emit(ValidatorEventMutationName, eventContext)
    }

    public async isExists(validator: Validator): Promise<boolean> {
        const connection = await this.connection
        const validatorRepository = connection.getRepository(ValidatorEntity)

        return await validatorRepository.count({
            where: {
                namespace: validator.namespace,
                name: validator.name
            }
        }) > 0
    }

    public async setMetadata(validator: Validator, snapshotMetadata: SnapshotMetadata<ValidatorMetadata>, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const validatorRepository = connection.getRepository(ValidatorEntity)
        const metadataCustomRepository = getCustomRepository(connection, MetadataRepository)

        const validatorEntity = await validatorRepository.findOne({
            where: {
                namespace: validator.namespace,
                name: validator.name
            }
        })

        if (!validatorEntity) {
            throw new ValidatorDoesNotExists
        }

        validatorEntity.metadata.metadata.custom = snapshotMetadata.metadata.custom
        await metadataCustomRepository.update(validatorEntity.metadata.id, {
            metadata: validatorEntity.metadata.metadata,
            revisionNumber: snapshotMetadata.revisionNumber
        }, nestedTransaction)

        const eventContext: EventContext = {
            type: ValidatorEventMutation.SetMetadata,
            validatorId: validatorEntity.id
        }
        this.eventEmitter.emit(ValidatorEventMutationName, eventContext)
    }

    public async remove(validator: Validator, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const validatorRepository = connection.getRepository(ValidatorEntity)
        const metadataRepository = connection.getRepository(Metadata)

        const validatorEntity = await validatorRepository.findOne({
            where: {
                namespace: validator.namespace,
                name: validator.name
            },
            relations: ['method']
        })

        /**
         * Выйти из метода, если ресурса и так не существовало
         */
        if (!validatorEntity) {
            return
        }

        /**
         * Идентификатор для события
         */
        const validatorId = validatorEntity.id

        await transaction(nestedTransaction, connection, async () => {
            await mutationQuery(true, () => {
                return validatorRepository.remove(validatorEntity)
            })

            await mutationQuery(true, () => {
                return metadataRepository.remove(validatorEntity.metadata)
            })

            /**
             * Попытаться удалить метод охранника, если он не используется
             */
            try {
                await this.methodService.removeMethod(validatorEntity.method, true)
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
            type: ValidatorEventMutation.Remove,
            validatorId: validatorId
        }
        this.eventEmitter.emit(ValidatorEventMutationName, eventContext)
    }

    public onMutation(handler: (context: EventContext) => void): void {
        this.eventEmitter.on(ValidatorEventMutationName, handler)
    }

}
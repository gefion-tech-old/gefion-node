import { injectable, inject } from 'inversify'
import { ISignalService } from './signal.interface'
import { Connection } from 'typeorm'
import { 
    Signal as SignalEntity,
    Guard as GuardEntity,
    Filter as FilterEntity,
    Validator as ValidatorEntity,
    SignalValidator,
    SignalFilter,
    SignalGuard
} from '../entities/signal.entity'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'
import { 
    Signal, 
    SignalMetadata,
    CreateSignal,
    SignalEventMutation,
    SignalEventMutationName,
    EventContext
} from './signal.types'
import { 
    SignalDoesNotExist,
    ValidatorAlreadyBound,
    GuardAlreadyBound,
    FilterAlreadyBound,
    InputSignalDoesNotExist,
    OutputSignalDoesNotExist,
    SignalUsedError,
    SignalAlreadyExists
} from './signal.errors'
import { isErrorCode, SqliteErrorCode } from '../../../core/typeorm/utils/error-code'
import { CREATOR_SYMBOL, ResourceType } from '../creator/creator.types'
import { ICreatorService } from '../creator/creator.interface'
import { transaction } from '../../../core/typeorm/utils/transaction'
import { GraphRepository } from './repositories/graph.repository'
import { mutationQuery } from '../../../core/typeorm/utils/mutation-query'
import { EventEmitter } from 'events'
import { SnapshotMetadata } from '../metadata/metadata.types'
import { MetadataRepository } from '../metadata/repositories/metadata.repository'
import { Metadata } from '../entities/metadata.entity'
import { getCustomRepository } from '../../../core/typeorm/utils/custom-repository'
import { Filter } from './filter/filter.types'
import { Guard } from './guard/guard.types'
import { Validator } from './validator/validator.types'
import { FilterDoesNotExists } from './filter/filter.errors'
import { GuardDoesNotExists } from './guard/guard.errors'
import { ValidatorDoesNotExists } from './validator/validator.errors'

@injectable()
export class SignalService implements ISignalService {

    private eventEmitter = new EventEmitter

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        private connection: Promise<Connection>,

        @inject(CREATOR_SYMBOL.CreatorService)
        private creatorService: ICreatorService
    ) {}

    public async create(options: CreateSignal, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const signalRepository = connection.getRepository(SignalEntity)

        if (await this.isExists(options.signal)) {
            throw new SignalAlreadyExists
        }

        const signalEntity = await transaction(nestedTransaction, connection, async () => {
            const signalEntity = await mutationQuery(true, () => {
                return signalRepository.save({
                    namespace: options.signal.namespace,
                    name: options.signal.name,
                    metadata: {
                        metadata: {
                            default: options.defaultMetadata,
                            custom: null
                        }
                    }
                })
            })

            await this.creatorService.bind({
                type: ResourceType.Signal,
                id: signalEntity.id
            }, options.creator, true)

            return signalEntity
        })

        const eventContext: EventContext = {
            type: SignalEventMutation.Create,
            signalId: signalEntity.id
        }
        this.eventEmitter.emit(SignalEventMutationName, eventContext)
    }

    public async isExists(signal: Signal): Promise<boolean> {
        const connection = await this.connection
        const signalRepository = connection.getRepository(SignalEntity)
        return await signalRepository.count(signal) > 0
    }

    public async getSignalId(signal: Signal): Promise<number | undefined> {
        const connection = await this.connection
        const signalRepository = connection.getRepository(SignalEntity)

        const signalEntity = await signalRepository.findOne({
            where: {
                namespace: signal.namespace,
                name: signal.name
            }
        })

        if (!signalEntity) {
            return
        }

        return signalEntity.id
    }

    public async setCustomMetadata(signal: Signal, snapshotMetadata: SnapshotMetadata<SignalMetadata>, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const signalRepository = connection.getRepository(SignalEntity)
        const metadataCustomRepository = getCustomRepository(connection, MetadataRepository)

        const signalEntity = await signalRepository.findOne({
            where: {
                namespace: signal.namespace,
                name: signal.name
            }
        })

        if (!signalEntity) {
            throw new SignalDoesNotExist
        }

        signalEntity.metadata.metadata.custom = snapshotMetadata.metadata.custom
        await metadataCustomRepository.update(signalEntity.metadata.id, {
            metadata: signalEntity.metadata.metadata,
            revisionNumber: snapshotMetadata.revisionNumber
        }, nestedTransaction)

        const eventContext: EventContext = {
            type: SignalEventMutation.SetCustomMetadata,
            signalId: signalEntity.id
        }
        this.eventEmitter.emit(SignalEventMutationName, eventContext)
    }

    public async addValidator(signal: Signal, validator: Validator, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const signalRepository = connection.getRepository(SignalEntity)
        const validatorRepository = connection.getRepository(ValidatorEntity)
        const signalValidatorRepository = connection.getRepository(SignalValidator)

        const signalEntity = await signalRepository.findOne({
            where: {
                namespace: signal.namespace,
                name: signal.name
            }
        })

        if (!signalEntity) {
            throw new SignalDoesNotExist
        }

        const validatorEntity = await validatorRepository.findOne({
            where: {
                namespace: validator.namespace,
                name: validator.name
            }
        })

        if (!validatorEntity) {
            throw new ValidatorDoesNotExists
        }

        try {
            /**
             * Транзакция из-за каскадных запросов
             */
            await transaction(nestedTransaction, connection, async () => {
                await mutationQuery(true, () => {
                    return signalValidatorRepository.save({
                        signalId: signalEntity.id,
                        validatorId: validatorEntity.id,
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
                throw new ValidatorAlreadyBound
            }

            throw error
        }

        const eventContext: EventContext = {
            type: SignalEventMutation.AddValidator,
            signalId: signalEntity.id,
            validatorId: validatorEntity.id
        }
        this.eventEmitter.emit(SignalEventMutationName, eventContext)
    }

    public async removeValidator(signal: Signal, validator: Validator, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const signalRepository = connection.getRepository(SignalEntity)
        const validatorRepository = connection.getRepository(ValidatorEntity)
        const signalValidatorRepository = connection.getRepository(SignalValidator)
        const metadataRepository = connection.getRepository(Metadata)

        const signalEntity = await signalRepository.findOne({
            where: {
                namespace: signal.namespace,
                name: signal.name
            }
        })
        
        if (!signalEntity) {
            throw new SignalDoesNotExist
        }
        
        const validatorEntity = await validatorRepository.findOne({
            where: {
                namespace: validator.namespace,
                name: validator.name
            }
        })

        if (!validatorEntity) {
            throw new ValidatorDoesNotExists
        }

        const signalValidatorEntity = await signalValidatorRepository.findOne({
            where: {
                signalId: signalEntity.id,
                validatorId: validatorEntity.id
            }
        })

        /**
         * Если связи с сигналом изначально не было, то выйти из функции
         */
        if (!signalValidatorEntity) {
            return
        }

        await transaction(nestedTransaction, connection, async () => {
            await mutationQuery(true, () => {
                return signalValidatorRepository.remove(signalValidatorEntity)
            })

            await mutationQuery(true, () => {
                return metadataRepository.remove(signalValidatorEntity.metadata)
            })
        })

        const eventContext: EventContext = {
            type: SignalEventMutation.RemoveValidator,
            signalId: signalEntity.id,
            validatorId: validatorEntity.id
        }
        this.eventEmitter.emit(SignalEventMutationName, eventContext)
    }

    public async addGuard(signal: Signal, guard: Guard, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const signalRepository = connection.getRepository(SignalEntity)
        const guardRepository = connection.getRepository(GuardEntity)
        const signalGuardRepository = connection.getRepository(SignalGuard)

        const signalEntity = await signalRepository.findOne({
            where: {
                namespace: signal.namespace,
                name: signal.name
            }
        })
        
        if (!signalEntity) {
            throw new SignalDoesNotExist
        }

        const guardEntity = await guardRepository.findOne({
            where: {
                namespace: guard.namespace,
                name: guard.name
            }
        })
        
        if (!guardEntity) {
            throw new GuardDoesNotExists
        }

        try {
            /**
             * Транзакция из-за каскадных запросов
             */
            await transaction(nestedTransaction, connection, async () => {
                await mutationQuery(true, () => {
                    return signalGuardRepository.save({
                        signalId: signalEntity.id,
                        guardId: guardEntity.id,
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
                throw new GuardAlreadyBound
            }

            throw error
        }

        const eventContext: EventContext = {
            type: SignalEventMutation.AddGuard,
            signalId: signalEntity.id,
            guardId: guardEntity.id
        }
        this.eventEmitter.emit(SignalEventMutationName, eventContext)
    }

    public async removeGuard(signal: Signal, guard: Guard, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const signalRepository = connection.getRepository(SignalEntity)
        const guardRepository = connection.getRepository(GuardEntity)
        const signalGuardRepository = connection.getRepository(SignalGuard)
        const metadataRepository = connection.getRepository(Metadata)

        const signalEntity = await signalRepository.findOne({
            where: {
                namespace: signal.namespace,
                name: signal.name
            }
        })

        if (!signalEntity) {
            throw new SignalDoesNotExist
        }

        const guardEntity = await guardRepository.findOne({
            where: {
                namespace: guard.namespace,
                name: guard.name
            }
        })

        if (!guardEntity) {
            throw new GuardDoesNotExists
        }

        const signalGuardEntity = await signalGuardRepository.findOne({
            where: {
                signalId: signalEntity.id,
                guardId: guardEntity.id
            }
        })

        /**
         * Если связи с сигналом изначально не было, то выйти из функции
         */
        if (!signalGuardEntity) {
            return
        }

        await transaction(nestedTransaction, connection, async () => {
            await mutationQuery(true, () => {
                return signalGuardRepository.remove(signalGuardEntity)
            })

            await mutationQuery(true, () => {
                return metadataRepository.remove(signalGuardEntity.metadata)
            })
        })

        const eventContext: EventContext = {
            type: SignalEventMutation.RemoveGuard,
            signalId: signalEntity.id,
            guardId: guardEntity.id
        }
        this.eventEmitter.emit(SignalEventMutationName, eventContext)
    }

    public async addFilter(signal: Signal, filter: Filter, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const signalRepository = connection.getRepository(SignalEntity)
        const filterRepository = connection.getRepository(FilterEntity)
        const signalFilterRepository = connection.getRepository(SignalFilter)

        const signalEntity = await signalRepository.findOne({
            where: {
                namespace: signal.namespace,
                name: signal.name
            }
        })

        if (!signalEntity) {
            throw new SignalDoesNotExist
        }

        const filterEntity = await filterRepository.findOne({
            where: {
                namespace: filter.namespace,
                name: filter.name
            }
        })

        if (!filterEntity) {
            throw new FilterDoesNotExists
        }

        try {
            /**
             * Транзакция из-за каскадных запросов
             */
            await transaction(nestedTransaction, connection, async () => {
                await mutationQuery(true, () => {
                    return signalFilterRepository.save({
                        signalId: signalEntity.id,
                        filterId: filterEntity.id,
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
                throw new FilterAlreadyBound
            }

            throw error
        }

        const eventContext: EventContext = {
            type: SignalEventMutation.AddFilter,
            signalId: signalEntity.id,
            filterId: filterEntity.id
        }
        this.eventEmitter.emit(SignalEventMutationName, eventContext)
    }

    public async removeFilter(signal: Signal, filter: Filter, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const signalRepository = connection.getRepository(SignalEntity)
        const filterRepository = connection.getRepository(FilterEntity)
        const signalFilterRepository = connection.getRepository(SignalFilter)
        const metadataRepository = connection.getRepository(Metadata)

        const signalEntity = await signalRepository.findOne({
            where: {
                namespace: signal.namespace,
                name: signal.name
            }
        })

        if (!signalEntity) {
            throw new SignalDoesNotExist
        }

        const filterEntity = await filterRepository.findOne({
            where: {
                namespace: filter.namespace,
                name: filter.name
            }
        })

        if (!filterEntity) {
            throw new FilterDoesNotExists
        }

        const signalFilterEntity = await signalFilterRepository.findOne({
            where: {
                signalId: signalEntity.id,
                filterId: filterEntity.id
            }
        })

        /**
         * Если связи с сигналом изначально не было, то выйти из функции
         */
        if (!signalFilterEntity) {
            return
        }

        await transaction(nestedTransaction, connection, async () => {
            await mutationQuery(true, () => {
                return signalFilterRepository.remove(signalFilterEntity)
            })

            await mutationQuery(true, () => {
                return metadataRepository.remove(signalFilterEntity.metadata)
            })
        })

        const eventContext: EventContext = {
            type: SignalEventMutation.RemoveFilter,
            signalId: signalEntity.id,
            filterId: filterEntity.id
        }
        this.eventEmitter.emit(SignalEventMutationName, eventContext)
    }

    public async connect(outSignal: Signal, intoSignal: Signal, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const signalRepository = connection.getRepository(SignalEntity)
        const graphRepository = getCustomRepository(connection, GraphRepository)

        /**
         * Получить сущности указанных сигналов
         */
        const [outSignalEntity, intoSignalEntity] = await (async (): Promise<[SignalEntity | undefined, SignalEntity | undefined]> => {
            const outSignalEntity = await signalRepository.findOne({
                where: {
                    name: outSignal.name,
                    namespace: outSignal.namespace
                }
            })

            const intoSignalEntity = await signalRepository.findOne({
                where: {
                    name: intoSignal.name,
                    namespace: intoSignal.namespace
                }
            })

            return [outSignalEntity, intoSignalEntity]
        })()

        /**
         * Выбросить ошибку несуществующего выходного сигнала
         */
        if (!outSignalEntity) {
            throw new OutputSignalDoesNotExist
        }

        /**
         * Выбросить ошибку несуществующего входного сигнала
         */
        if (!intoSignalEntity) {
            throw new InputSignalDoesNotExist
        }

        /**
         * Сохранить связь сигналов
         */
        try {
            await graphRepository.connect(outSignalEntity, intoSignalEntity, nestedTransaction)
        } catch(error) {
            block: {
                if (isErrorCode(error, SqliteErrorCode.SQLITE_CONSTRAINT_PRIMARYKEY)) {
                    break block
                }

                throw error
            }
        }

        const eventContext: EventContext = {
            type: SignalEventMutation.Connect,
            signalId: outSignalEntity.id
        }
        this.eventEmitter.emit(SignalEventMutationName, eventContext)
    }

    public async unconnect(outSignal: Signal, intoSignal: Signal, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const signalRepository = connection.getRepository(SignalEntity)
        const graphRepository = getCustomRepository(connection, GraphRepository)

        /**
         * Получить сущности указанных сигналов
         */
        const [outSignalEntity, intoSignalEntity] = await (async (): Promise<[SignalEntity | undefined, SignalEntity | undefined]> => {
            const outSignalEntity = await signalRepository.findOne({
                where: {
                    name: outSignal.name,
                    namespace: outSignal.namespace
                }
            })

            const intoSignalEntity = await signalRepository.findOne({
                where: {
                    name: intoSignal.name,
                    namespace: intoSignal.namespace
                }
            })

            return [outSignalEntity, intoSignalEntity]
        })()

        /**
         * Выбросить ошибку несуществующего выходного сигнала
         */
        if (!outSignalEntity) {
            throw new OutputSignalDoesNotExist
        }

        /**
         * Выбросить ошибку несуществующего входного сигнала
         */
        if (!intoSignalEntity) {
            throw new InputSignalDoesNotExist
        }

        /**
         * Отвязать выходной сигнал от указанного входного сигнала
         */
        await graphRepository.unconnect(outSignalEntity, intoSignalEntity, nestedTransaction)

        const eventContext: EventContext = {
            type: SignalEventMutation.Unconnect,
            signalId: outSignalEntity.id
        }
        this.eventEmitter.emit(SignalEventMutationName, eventContext)
    }

    public async remove(signal: Signal, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const signalRepository = connection.getRepository(SignalEntity)
        const metadataRepository = connection.getRepository(Metadata)

        /**
         * Получить экземпляр сигнала со всеми прикреплёнными к нему ресурсами
         */
        const signalEntity = await signalRepository.findOne({
            where: {
                namespace: signal.namespace,
                name: signal.name
            },
            relations: ['signalValidators', 'signalGuards', 'signalFilters']
        })

        /**
         * Если сигнала не существует, то и удалять нечего
         */
        if (!signalEntity) {
            return
        }

        /**
         * Идентификатор удаляемого сигнала для события
         */
        const signalId = signalEntity.id

        /**
         * Удаление сигнала вместе со всеми его связями
         */
        await transaction(nestedTransaction, connection, async () => {
            /**
             * Получить список идентификаторов всех сущностей метаданных, которые нужно
             * удалить после удаления сигнала. Удалить раньше нельзя из-за RESTRICT ограничения
             */
            const metadataIds = [
                signalEntity.metadata.id,
                ...signalEntity.signalFilters.map(signalFilterEntity => {
                    return signalFilterEntity.metadata.id
                }),
                ...signalEntity.signalGuards.map(signalGuardEntity => {
                    return signalGuardEntity.metadata.id
                }),
                ...signalEntity.signalValidators.map(signalValidatorEntity => {
                    return signalValidatorEntity.metadata.id
                })
            ]

            try {
                await mutationQuery(true, () => {
                    return signalRepository.remove(signalEntity)
                })
            } catch(error) {
                if (isErrorCode(error, [
                    SqliteErrorCode.SQLITE_CONSTRAINT_FOREIGNKEY,
                    SqliteErrorCode.SQLITE_CONSTRAINT_TRIGGER
                ])) {
                    throw new SignalUsedError
                }
            }

            await mutationQuery(true, () => {
                return metadataRepository.delete(metadataIds)
            })
        })

        const eventContext: EventContext = {
            type: SignalEventMutation.Remove,
            signalId: signalId
        }
        this.eventEmitter.emit(SignalEventMutationName, eventContext)
    }

    public onSignalMutation(handler: (context: EventContext) => void): void {
        this.eventEmitter.on(SignalEventMutationName, handler)
    }

}
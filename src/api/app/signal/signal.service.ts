import { injectable, inject } from 'inversify'
import { ISignalService } from './signal.interface'
import { Connection, Repository } from 'typeorm'
import { Signal as SignalEntity } from '../entities/signal.entity'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'
import { 
    Signal, 
    SignalMetadata,
    CreateSignal,
    SignalEventMutation,
    SignalEventMutationName,
    EventContext
} from './signal.type'
import { 
    SignalDoesNotExist,
    SignalMethodNotDefined,
    ValidatorAlreadyBound,
    GuardAlreadyBound,
    FilterAlreadyBound,
    InputSignalDoesNotExist,
    OutputSignalDoesNotExist,
    SignalUsedError,
    SignalAlreadyExists
} from './signal.errors'
import { METHOD_SYMBOL, Method } from '../method/method.types'
import { IMethodService } from '../method/method.interface'
import { MethodUsedError } from '../method/method.errors'
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

@injectable()
export class SignalService implements ISignalService {

    private signalRepository: Promise<Repository<SignalEntity>>
    private connection: Promise<Connection>
    private eventEmitter = new EventEmitter

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        connection: Promise<Connection>,

        @inject(METHOD_SYMBOL.MethodService)
        private methodService: IMethodService,

        @inject(CREATOR_SYMBOL.CreatorService)
        private creatorService: ICreatorService
    ) {
        this.connection = connection
        this.signalRepository = connection
            .then(connection => {
                return connection.getRepository(SignalEntity)
            })
    }

    public async create(options: CreateSignal, nestedTransaction = false): Promise<void> {
        const signalRepository = await this.signalRepository
        const connection = await this.connection

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
        const signalRepository = await this.signalRepository
        return await signalRepository.count(signal) > 0
    }

    public async getSignalId(signal: Signal): Promise<number | undefined> {
        const signalRepository = await this.signalRepository
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
        const signalRepository = await this.signalRepository
        const connection = await this.connection
        const metadataRepository = getCustomRepository(connection, MetadataRepository)

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
        await metadataRepository.update(signalEntity.metadata.id, {
            metadata: signalEntity.metadata.metadata,
            revisionNumber: snapshotMetadata.revisionNumber
        }, nestedTransaction)

        const eventContext: EventContext = {
            type: SignalEventMutation.SetCustomMetadata,
            signalId: signalEntity.id
        }
        this.eventEmitter.emit(SignalEventMutationName, eventContext)
    }

    public async addValidator(signal: Signal, method: Method, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const signalRepository = await this.signalRepository

        const signalEntity = await signalRepository.findOne({
            where: {
                namespace: signal.namespace,
                name: signal.name
            }
        })
        const methodId = await this.methodService.getMethodId(method)

        if (!signalEntity) {
            throw new SignalDoesNotExist
        }

        if (!methodId) {
            throw new SignalMethodNotDefined
        }

        try {
            await mutationQuery(nestedTransaction, () => {
                return connection
                    .createQueryBuilder()
                    .relation(SignalEntity, 'validators')
                    .of(signalEntity)
                    .add(methodId)
            })
        } catch(error) {
            if (isErrorCode(error, SqliteErrorCode.SQLITE_CONSTRAINT_PRIMARYKEY)) {
                throw new ValidatorAlreadyBound
            }

            throw error
        }

        const eventContext: EventContext = {
            type: SignalEventMutation.AddValidator,
            signalId: signalEntity.id
        }
        this.eventEmitter.emit(SignalEventMutationName, eventContext)
    }

    public async removeValidator(signal: Signal, method: Method, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const signalRepository = await this.signalRepository

        const signalEntity = await signalRepository.findOne({
            where: {
                namespace: signal.namespace,
                name: signal.name
            }
        })
        const methodId = await this.methodService.getMethodId(method)

        if (!signalEntity) {
            throw new SignalDoesNotExist
        }

        if (!methodId) {
            throw new SignalMethodNotDefined
        }

        await mutationQuery(nestedTransaction, () => {
            return connection
                .createQueryBuilder()
                .relation(SignalEntity, 'validators')
                .of(signalEntity)
                .remove(methodId)
        })

        /**
         * Попытаться удалить метод и игнорировать ошибку, если метод
         * используется
         */
        try {
            await this.methodService.removeMethod(method, nestedTransaction)
        } catch(error) {
            block: {
                if (error instanceof MethodUsedError) {
                    break block
                }

                throw error
            }
        }

        const eventContext: EventContext = {
            type: SignalEventMutation.RemoveValidator,
            signalId: signalEntity.id
        }
        this.eventEmitter.emit(SignalEventMutationName, eventContext)
    }

    public async addGuard(signal: Signal, method: Method, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const signalRepository = await this.signalRepository

        const signalEntity = await signalRepository.findOne({
            where: {
                namespace: signal.namespace,
                name: signal.name
            }
        })
        const methodId = await this.methodService.getMethodId(method)

        if (!signalEntity) {
            throw new SignalDoesNotExist
        }

        if (!methodId) {
            throw new SignalMethodNotDefined
        }

        try {
            await mutationQuery(nestedTransaction, () => {
                return connection
                    .createQueryBuilder()
                    .relation(SignalEntity, 'guards')
                    .of(signalEntity)
                    .add(methodId)
            })
        } catch(error) {
            if (isErrorCode(error, SqliteErrorCode.SQLITE_CONSTRAINT_PRIMARYKEY)) {
                throw new GuardAlreadyBound
            }

            throw error
        }

        const eventContext: EventContext = {
            type: SignalEventMutation.AddGuard,
            signalId: signalEntity.id
        }
        this.eventEmitter.emit(SignalEventMutationName, eventContext)
    }

    public async removeGuard(signal: Signal, method: Method, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const signalRepository = await this.signalRepository

        const signalEntity = await signalRepository.findOne({
            where: {
                namespace: signal.namespace,
                name: signal.name
            }
        })
        const methodId = await this.methodService.getMethodId(method)

        if (!signalEntity) {
            throw new SignalDoesNotExist
        }

        if (!methodId) {
            throw new SignalMethodNotDefined
        }

        await mutationQuery(nestedTransaction, () => {
            return connection
                .createQueryBuilder()
                .relation(SignalEntity, 'guards')
                .of(signalEntity)
                .remove(methodId)
        })

        /**
         * Попытаться удалить метод и игнорировать ошибку, если метод
         * используется
         */
        try {
            await this.methodService.removeMethod(method, nestedTransaction)
        } catch(error) {
            block: {
                if (error instanceof MethodUsedError) {
                    break block
                }

                throw error
            }
        }

        const eventContext: EventContext = {
            type: SignalEventMutation.RemoveGuard,
            signalId: signalEntity.id
        }
        this.eventEmitter.emit(SignalEventMutationName, eventContext)
    }

    public async addFilter(signal: Signal, method: Method, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const signalRepository = await this.signalRepository

        const signalEntity = await signalRepository.findOne({
            where: {
                namespace: signal.namespace,
                name: signal.name
            }
        })
        const methodId = await this.methodService.getMethodId(method)

        if (!signalEntity) {
            throw new SignalDoesNotExist
        }

        if (!methodId) {
            throw new SignalMethodNotDefined
        }

        try {
            await mutationQuery(nestedTransaction, () => {
                return connection
                    .createQueryBuilder()
                    .relation(SignalEntity, 'filters')
                    .of(signalEntity)
                    .add(methodId)
            })
        } catch(error) {
            if (isErrorCode(error, SqliteErrorCode.SQLITE_CONSTRAINT_PRIMARYKEY)) {
                throw new FilterAlreadyBound
            }

            throw error
        }

        const eventContext: EventContext = {
            type: SignalEventMutation.AddFilter,
            signalId: signalEntity.id
        }
        this.eventEmitter.emit(SignalEventMutationName, eventContext)
    }

    public async removeFilter(signal: Signal, method: Method, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const signalRepository = await this.signalRepository

        const signalEntity = await signalRepository.findOne({
            where: {
                namespace: signal.namespace,
                name: signal.name
            }
        })
        const methodId = await this.methodService.getMethodId(method)

        if (!signalEntity) {
            throw new SignalDoesNotExist
        }

        if (!methodId) {
            throw new SignalMethodNotDefined
        }

        await mutationQuery(nestedTransaction, () => {
            return connection
                .createQueryBuilder()
                .relation(SignalEntity, 'filters')
                .of(signalEntity)
                .remove(methodId)
        })

        /**
         * Попытаться удалить метод и игнорировать ошибку, если метод
         * используется
         */
        try {
            await this.methodService.removeMethod(method, nestedTransaction)
        } catch(error) {
            block: {
                if (error instanceof MethodUsedError) {
                    break block
                }

                throw error
            }
        }

        const eventContext: EventContext = {
            type: SignalEventMutation.RemoveFilter,
            signalId: signalEntity.id
        }
        this.eventEmitter.emit(SignalEventMutationName, eventContext)
    }

    public async connect(outSignal: Signal, intoSignal: Signal, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const signalRepository = await this.signalRepository
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
        const signalRepository = await this.signalRepository
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
        const signalRepository = await this.signalRepository
        const metadataRepository = connection.getRepository(Metadata)

        /**
         * Получить экземпляр сигнала со всеми прикреплёнными к нему методами
         */
        const signalEntity = await signalRepository.findOne({
            where: {
                namespace: signal.namespace,
                name: signal.name
            },
            relations: ['validators', 'guards', 'filters']
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
         * Удаление сигнала и попытка полностью удалить все привязанные к нему методы и
         * метаданные
         */
        await transaction(nestedTransaction, connection, async () => {
            await transaction(true, connection, async () => {
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
                    return metadataRepository.remove(signalEntity.metadata)
                })
            })

            await this.methodService.removeMethods(
                ([] as Method[]).concat(signalEntity.validators.map(methodEntity => {
                    return {
                        type: methodEntity.type,
                        namespace: methodEntity.namespace,
                        name: methodEntity.name
                    }
                })).concat(signalEntity.guards.map(methodEntity => {
                    return {
                        type: methodEntity.type,
                        namespace: methodEntity.namespace,
                        name: methodEntity.name
                    }
                })).concat(signalEntity.filters.map(methodEntity => {
                    return {
                        type: methodEntity.type,
                        namespace: methodEntity.namespace,
                        name: methodEntity.name
                    }
                })),
                true
            )
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
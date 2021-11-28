import { injectable, inject } from 'inversify'
import { ISignalService } from './signal.interface'
import { Connection, Repository } from 'typeorm'
import { Signal as SignalEntity } from '../entities/signal.entity'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'
import { 
    Signal, 
    SignalMetadata,
    CreateSignal,
    SIGNAL_SYMBOL
} from './signal.type'
import { 
    SignalDoesNotExist,
    SignalMethodNotDefined,
    ValidatorAlreadyExist,
    GuardAlreadyExists,
    FilterAlreadyExists,
    InputSignalDoesNotExist,
    OutputSignalDoesNotExist,
    SignalUsedError
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
import { IGraphCacheService } from './graph-cache/graph-cache.interface'

@injectable()
export class SignalService implements ISignalService {

    private signalRepository: Promise<Repository<SignalEntity>>
    private connection: Promise<Connection>

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        connection: Promise<Connection>,

        @inject(METHOD_SYMBOL.MethodService)
        private methodService: IMethodService,

        @inject(CREATOR_SYMBOL.CreatorService)
        private creatorService: ICreatorService,

        @inject(SIGNAL_SYMBOL.GraphCacheService)
        private graphCacheService: IGraphCacheService
    ) {
        this.connection = connection
        this.signalRepository = connection
            .then(connection => {
                return connection.getRepository(SignalEntity)
            })
    }

    public async createIfNotCreated(options: CreateSignal, nestedTransaction = false): Promise<void> {
        const signalRepository = await this.signalRepository
        const connection = await this.connection

        if (await this.isExists(options.signal)) {
            return
        }

        const signalEntity = await transaction(nestedTransaction, connection, async () => {
            const signalEntity = await mutationQuery(true, () => {
                return signalRepository.save({
                    namespace: options.signal.namespace,
                    name: options.signal.name,
                    metadata: {
                        default: options.defaultMetadata
                    }
                })
            })

            await this.creatorService.bind({
                type: ResourceType.Signal,
                id: signalEntity.id
            }, options.creator, true)

            return signalEntity
        })

        await this.graphCacheService.updateSignalAndSync(signalEntity.id)
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

    public async getMetadata(signal: Signal): Promise<SignalMetadata | undefined> {
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

        return signalEntity.metadata
    }

    public async setCustomMetadata(signal: Signal, customMetadata: any, nestedTransaction = false): Promise<void> {
        const signalRepository = await this.signalRepository

        const signalEntity = await signalRepository.findOne({
            where: {
                namespace: signal.namespace,
                name: signal.name
            }
        })

        if (!signalEntity) {
            throw new SignalDoesNotExist
        }

        signalEntity.metadata.custom = customMetadata
        const newSignalEntity = await mutationQuery(nestedTransaction, () => {
            return signalRepository.save(signalEntity)
        })

        await this.graphCacheService.updateSignalAndSync(newSignalEntity.id)
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
                throw new ValidatorAlreadyExist
            }

            throw error
        }

        await this.graphCacheService.updateSignalAndSync(signalEntity.id)
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

        await this.graphCacheService.updateSignalAndSync(signalEntity.id)
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
                throw new GuardAlreadyExists
            }

            throw error
        }

        await this.graphCacheService.updateSignalAndSync(signalEntity.id)
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

        await this.graphCacheService.updateSignalAndSync(signalEntity.id)
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
                throw new FilterAlreadyExists
            }

            throw error
        }

        await this.graphCacheService.updateSignalAndSync(signalEntity.id)
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

        await this.graphCacheService.updateSignalAndSync(signalEntity.id)
    }

    public async connect(outSignal: Signal, intoSignal: Signal, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const signalRepository = await this.signalRepository
        const graphRepository = connection.getCustomRepository(GraphRepository)

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

        await this.graphCacheService.updateSignalAndSync(outSignalEntity.id)
    }

    public async unconnect(outSignal: Signal, intoSignal: Signal, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const signalRepository = await this.signalRepository
        const graphRepository = connection.getCustomRepository(GraphRepository)

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

        await this.graphCacheService.updateSignalAndSync(outSignalEntity.id)
    }

    public async remove(signal: Signal, nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const signalRepository = await this.signalRepository

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
         * Удаление сигнала и попытка полностью удалить все привязанные к нему методы
         */
        await transaction(nestedTransaction, connection, async () => {
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

        await this.graphCacheService.updateSignalAndSync(signalEntity.id)
    }

}
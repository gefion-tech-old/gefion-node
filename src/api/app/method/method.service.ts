import { injectable, inject } from 'inversify'
import { IMethodService } from './method.interface'
import { 
    MethodOptions, 
    Method, 
    Namespaces,
    MethodHandler,
    CallOptions,
    RPCMethodsMethodService,
    MethodId
} from './method.types'
import { Repository, Connection, EntityManager } from 'typeorm'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'
import { Method as MethodEntity } from '../entities/method.entity'
import { 
    HandlerAlreadyAttached,
    MethodNotAvailable,
    MethodUsedError
} from './method.errors'
import { RPC_SYMBOL } from '../../../core/rpc/rpc.types'
import { IRPCService } from '../../../core/rpc/rpc.interface'
import uniqid from 'uniqid'
import { activeTransaction } from '../../../core/typeorm/utils/active-transaction'
import { isErrorCode, SqliteErrorCode } from '../../../core/typeorm/utils/error-code'
import { ICreatorService } from '../creator/creator.interface'
import { CREATOR_SYMBOL, ResourceType } from '../creator/creator.types'

@injectable()
export class MethodService implements IMethodService {

    private methodRepository: Promise<Repository<MethodEntity>>
    private connection: Promise<Connection>
    private namespaces: Namespaces = new Map

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        connection: Promise<Connection>,

        @inject(RPC_SYMBOL.RPCService)
        private rpcService: IRPCService,

        @inject(CREATOR_SYMBOL.CreatorService)
        private creatorService: ICreatorService
    ) {
        this.connection = connection
        this.methodRepository = connection
            .then(connection => {
                return connection.getRepository(MethodEntity)
            })
    }

    private getMethodHandler(method: Method): MethodHandler | undefined {
        const namespace = this.namespaces.get(method.namespace)

        if (!namespace) {
            return
        }

        const type = namespace.get(method.type)

        if (!type) {
            return
        }

        return type.get(method.name)
    }

    public async method(options: MethodOptions): Promise<void> {
        const connection = await this.connection
        
        await connection.manager.transaction(async transactionEntityManager => {
            const methodRepository = transactionEntityManager.getRepository(MethodEntity)

            const methodEntity = await (async (): Promise<MethodEntity | undefined> => {
                try {
                    return await methodRepository.save(options)
                } catch(error) {
                    /**
                     * Игнорировать ошибку уникальности, ведь она указывает на то,
                     * что метод уже создан, а это ожидаемая ситуация
                     */
                    if (isErrorCode(error, SqliteErrorCode.SQLITE_CONSTRAINT_UNIQUE)) {
                        return
                    }

                    throw error
                }
            })()

            if (methodEntity) {
                await this.creatorService.bind({
                    type: ResourceType.Method,
                    id: methodEntity.id
                }, options.creator)
            }
        })
        
        /**
         * Получить карту пространства имен, если её ещё не существует,
         * то создать и сохранить
         */
        const namespace = (() => {
            const namespace = this.namespaces.get(options.namespace) || new Map

            if (!this.namespaces.has(options.namespace)) {
                this.namespaces.set(options.namespace, namespace)
            }

            return namespace
        })()

        /**
         * Получить карту методов типа, если её ещё не существует, то создать
         * и сохранить
         */
        const type = (() => {
            const type = namespace.get(options.type) || new Map

            if (!namespace.has(options.type)) {
                namespace.set(options.type, type)
            }

            return type
        })()

        /**
         * Выдать исключение, если к методу уже привязан обработчик
         */
        if (type.has(options.name)) {
            throw new HandlerAlreadyAttached({
                namespace: options.namespace,
                type: options.type,
                name: options.name
            })
        }

        type.set(options.name, options.handler)
    }

    public isAvailable(method: Method): boolean {
        return Boolean(this.getMethodHandler(method))
    }

    public async getMethodId(method: Method): Promise<MethodId | undefined> {
        const methodRepository = await this.methodRepository
        const methodEntity = await methodRepository.findOne({
            where: {
                namespace: method.namespace,
                type: method.type,
                name: method.name
            }
        })
        return methodEntity?.id
    }

    public call(options: CallOptions): any {
        const methodHandler = this.getMethodHandler(options)

        if (!methodHandler) {
            throw new MethodNotAvailable({
                namespace: options.namespace,
                type: options.type,
                name: options.name
            })
        }

        return methodHandler(...options.args)
    }

    public async removeNamespace(namespace: string): Promise<void> {
        const methodRepository = await this.methodRepository

        try {
            await methodRepository.delete({
                namespace: namespace
            })
        } catch(error) {
            if (isErrorCode(error, [
                SqliteErrorCode.SQLITE_CONSTRAINT_FOREIGNKEY,
                SqliteErrorCode.SQLITE_CONSTRAINT_TRIGGER
            ])) {
                throw new MethodUsedError
            }

            throw error
        }

        this.namespaces.delete(namespace)
    }

    public async removeMethod(method: Method): Promise<void> {
        const methodRepository = await this.methodRepository

        try {
            await methodRepository.delete(method)
        } catch(error) {
            if (isErrorCode(error, [
                SqliteErrorCode.SQLITE_CONSTRAINT_FOREIGNKEY,
                SqliteErrorCode.SQLITE_CONSTRAINT_TRIGGER
            ])) {
                throw new MethodUsedError
            }

            throw error
        }

        const namespace = this.namespaces.get(method.namespace)
        if (namespace) {
            const type = namespace.get(method.type)
            if (type) {
                type.delete(method.name)
            }
        }
    }

    public async removeMethods(methods: Method[], transactionEntityManager?: EntityManager): Promise<void> {
        if (transactionEntityManager) {
            activeTransaction(transactionEntityManager)
        }

        /**
         * Фактическая функция для удаления методов с помощью переданного менеджера.
         * Игнорировать ошибки внешнего ключа
         */
        const removeMethods = async (entityManager: EntityManager) => {
            const methodRepository = entityManager.getRepository(MethodEntity)
            const salt = uniqid()

            for (const [index, method] of methods.entries()) {
                const savepoint = `${salt}${index}`
                try {
                    await entityManager.query(`SAVEPOINT "${savepoint}"`)
                    await methodRepository.delete(method)
                } catch(error) {
                    if (isErrorCode(error, [
                        SqliteErrorCode.SQLITE_CONSTRAINT_FOREIGNKEY,
                        SqliteErrorCode.SQLITE_CONSTRAINT_TRIGGER
                    ])) {
                        await entityManager.query(`ROLLBACK TO SAVEPOINT "${savepoint}"`)
                        continue
                    }

                    throw error
                }
    
                const namespace = this.namespaces.get(method.namespace)
                if (namespace) {
                    const type = namespace.get(method.type)
                    if (type) {
                        type.delete(method.name)
                    }
                }
            }
        }

        /**
         * Фактическое удаление методов с помощью транзакционного менеджера
         */
        if (transactionEntityManager) {
            await removeMethods(transactionEntityManager)
        } else {
            const connection = await this.connection
            const manager = connection.manager

            await manager.transaction(async transactionEntityManager => {
                await removeMethods(transactionEntityManager)
            })
        }
    }

    public async isConsistent(method: Method): Promise<boolean | undefined> {
        const responseList = await this.rpcService.call<boolean>(
            RPCMethodsMethodService.isAvailable, [method]
        )

        responseList.push({
            result: this.isAvailable(method),
            error: null
        })

        let TRUE = 0
        let FALSE = 0

        for (const response of responseList) {
            if (response.result === true) {
                TRUE++
            } else {
                FALSE++
            }
        }

        if (TRUE > 0 && FALSE > 0) {
            return false
        }

        if (FALSE === 0) {
            return true
        } else {
            return
        }
    }

}
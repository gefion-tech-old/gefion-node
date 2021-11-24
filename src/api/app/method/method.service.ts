import { injectable, inject } from 'inversify'
import { IMethodService } from './method.interface'
import { 
    MethodOptions, 
    Method, 
    Namespaces,
    Types,
    MethodDataList,
    MethodData,
    CallOptions,
    RPCMethodsMethodService,
    MethodId
} from './method.types'
import { Repository, Connection } from 'typeorm'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'
import { Method as MethodEntity } from '../entities/method.entity'
import { 
    HandlerAlreadyAttached,
    MethodNotAvailable,
    MethodUsedError,
    InvalidScriptID,
    AccessIsDenied
} from './method.errors'
import { RPC_SYMBOL } from '../../../core/rpc/rpc.types'
import { IRPCService } from '../../../core/rpc/rpc.interface'
import { isErrorCode, SqliteErrorCode } from '../../../core/typeorm/utils/error-code'
import { ICreatorService } from '../creator/creator.interface'
import { CREATOR_SYMBOL, ResourceType } from '../creator/creator.types'
import { VM_SYMBOL, ScriptID } from '../../../core/vm/vm.types'
import { IVMService } from '../../../core/vm/vm.interface'
import { transaction } from '../../../core/typeorm/utils/transaction'
import { mutationQuery } from '../../../core/typeorm/utils/mutation-query'

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
        private creatorService: ICreatorService,

        @inject(VM_SYMBOL.VMService)
        private vmService: IVMService
    ) {
        this.connection = connection
        this.methodRepository = connection
            .then(connection => {
                return connection.getRepository(MethodEntity)
            })
    }

    private getMethodData(method: Method): MethodData | undefined {
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

    public async method(options: MethodOptions, nestedTransaction = false): Promise<void> {
        const methodRepository = await this.methodRepository
        const connection = await this.connection

        /**
         * Провалидировать идентификатор скрипта в обработчике
         */
        if (!this.vmService.info(options.scriptId)) {
            throw new InvalidScriptID()
        }

        /**
         * Получить экземпляр метода из БД или создать его, если метода не существует
         */
        const methodEntity = await (async (): Promise<MethodEntity> => {
            const methodEntity = await methodRepository.findOne({
                where: {
                    namespace: options.namespace,
                    type: options.type,
                    name: options.name
                }
            })

            if (methodEntity) {
                return methodEntity
            } else {
                return await transaction<MethodEntity>(nestedTransaction, connection, async () => {
                    const methodEntity = await mutationQuery(true, () => {
                        return methodRepository.save(options)
                    })

                    await this.creatorService.bind({
                        type: ResourceType.Method,
                        id: methodEntity.id
                    }, options.creator, true)

                    return methodEntity
                })
            }
        })() 

        /**
         * Убедиться, что фактический создатель метода совпадает с текущим
         */
        if (!await this.creatorService.isResourceCreator({
            type: ResourceType.Method,
            id: methodEntity.id
        }, options.creator)) {
            throw new AccessIsDenied
        }

        
        /**
         * Получить карту пространства имен, если её ещё не существует,
         * то создать и сохранить
         */
        const namespace = (() => {
            const namespace: Types = this.namespaces.get(options.namespace) || new Map

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
            const type: MethodDataList = namespace.get(options.type) || new Map

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

        type.set(options.name, {
            handler: options.handler,
            scriptId: options.scriptId
        })
    }

    public isAvailable(method: Method): boolean {
        return Boolean(this.getMethodData(method))
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
        const methodData = this.getMethodData(options)

        if (!methodData) {
            throw new MethodNotAvailable({
                namespace: options.namespace,
                type: options.type,
                name: options.name
            })
        }

        return methodData.handler(...options.args)
    }

    public getScriptId(method: Method): ScriptID | undefined {
        const methodData = this.getMethodData(method)

        if (!methodData) {
            return
        }

        return methodData.scriptId
    }

    public async removeNamespace(namespace: string, nestedTransaction = false): Promise<void> {
        const methodRepository = await this.methodRepository

        try {
            await mutationQuery(nestedTransaction, () => {
                return methodRepository.delete({
                    namespace: namespace
                })
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

    public async removeMethod(method: Method, nestedTransaction = false): Promise<void> {
        const methodRepository = await this.methodRepository

        try {
            await mutationQuery(nestedTransaction, () => {
                return methodRepository.delete(method)
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

        const namespace = this.namespaces.get(method.namespace)
        if (namespace) {
            const type = namespace.get(method.type)
            if (type) {
                type.delete(method.name)
            }
        }
    }

    public async removeMethods(methods: Method[], nestedTransaction = false): Promise<void> {
        const connection = await this.connection
        const methodRepository = await this.methodRepository

        await transaction(nestedTransaction, connection, async () => {
            for (const method of methods) {
                try {
                    await transaction(true, connection, async () => {
                        await mutationQuery(true, () => {
                            return methodRepository.delete(method)
                        })
                    })
                } catch(error) {
                    if (isErrorCode(error, [
                        SqliteErrorCode.SQLITE_CONSTRAINT_FOREIGNKEY,
                        SqliteErrorCode.SQLITE_CONSTRAINT_TRIGGER
                    ])) {
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
        })
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
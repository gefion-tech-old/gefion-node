import { getContainer } from '../../../inversify.config'
import { IMethodService } from './method.interface'
import { METHOD_SYMBOL } from './method.types'
import {
    HandlerAlreadyAttached,
    MethodNotAvailable,
    MethodUsedError
} from './method.errors'
import { 
    Entity, 
    OneToOne, 
    JoinColumn, 
    PrimaryGeneratedColumn, 
    Connection
} from 'typeorm'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'
import { addTestEntity } from '../../../core/typeorm/utils/test-entities'
import { getRPCService } from '../../../core/rpc/__mock/RPCService.mock'
import { RPC_SYMBOL } from '../../../core/rpc/rpc.types'
import { Method } from '../entities/method.entity'
import { CreatorType } from '../creator/creator.types'

/**
 * Добавление тестовой сущности
 * -----
 */

@Entity()
class Test {

    @PrimaryGeneratedColumn()
    id: number

    @OneToOne(() => Method)
    @JoinColumn()
    method: Method

}
@Entity()
class Test2 {
    @PrimaryGeneratedColumn()
    id: number

    @OneToOne(() => Method, {
        onDelete: 'RESTRICT'
    })
    @JoinColumn()
    method: Method
}
addTestEntity(Test)
addTestEntity(Test2)
/**
 * -----
 */


beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('MethodService в MethodModule', () => {

    it(`
        Методы корректно создаются и их обработчики корректно к ним привязываются,
        а после метод корректно вызывается
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const methodService = container
            .get<IMethodService>(METHOD_SYMBOL.MethodService)

        const handler1Fn = jest.fn()
        const handler2Fn = jest.fn()

        const method1 = {
            namespace: 'namespace',
            type: 'type',
            name: 'name1'
        }
        const method2 = {
            namespace: 'namespace',
            type: 'type',
            name: 'name2'
        }

        await methodService.method({
            ...method1,
            handler: (boolean) => {
                handler1Fn()
                return boolean
            },
            creator: {
                type: CreatorType.System
            }
        })
        await methodService.method({
            ...method2,
            handler: (boolean) => {
                handler2Fn()
                return boolean
            },
            creator: {
                type: CreatorType.System
            }
        })

        await expect(methodService.getMethodId(method1))
            .resolves
            .toBeDefined()
        await expect(methodService.getMethodId(method1))
            .resolves
            .toBeGreaterThan(0)
        await expect(methodService.getMethodId(method2))
            .resolves
            .toBeDefined()
        await expect(methodService.getMethodId({
            ...method2,
            name: 'name3'
        })).resolves.toBeUndefined()

        expect(methodService.isAvailable(method1)).toBe(true)
        expect(methodService.isAvailable(method2)).toBe(true)
        expect(methodService.isAvailable({
            ...method2,
            name: 'name3'
        })).toBe(false)

        expect(methodService.call({
            ...method1,
            args: [true]
        })).toBe(true)
        expect(methodService.call({
            ...method2,
            args: [false]
        })).toBe(false)

        expect(handler1Fn).toBeCalledTimes(1)
        expect(handler2Fn).toBeCalledTimes(1)

        container.restore()
    })

    it(`
        Попытка привязать обработчик к методу, к которому уже привязан обработчик
        вызывает исключение
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const methodService = container
            .get<IMethodService>(METHOD_SYMBOL.MethodService)

        const handler1Fn = jest.fn()
        const handler2Fn = jest.fn()

        const method1 = {
            namespace: 'namespace',
            type: 'type',
            name: 'name1'
        }

        await expect(methodService.method({
            ...method1,
            handler: (boolean) => {
                handler1Fn()
                return boolean
            },
            creator: {
                type: CreatorType.System
            }
        })).resolves.toBeUndefined()
        await expect(methodService.method({
            ...method1,
            handler: () => {
                handler2Fn()
                return 'xxx'
            },
            creator: {
                type: CreatorType.System
            }
        })).rejects.toBeInstanceOf(HandlerAlreadyAttached)

        expect(methodService.call({
            ...method1,
            args: [true]
        })).toBe(true)
        expect(handler1Fn).toBeCalledTimes(1)
        expect(handler2Fn).toBeCalledTimes(0)

        container.restore()
    })

    it(`
        Попытка вызвать недоступный метод приводит к исключению
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const methodService = container
            .get<IMethodService>(METHOD_SYMBOL.MethodService)

        await expect((async () => {
            methodService.call({
                namespace: 'namespace',
                type: 'type',
                name: 'name1',
                args: []
            })
        })()).rejects.toBeInstanceOf(MethodNotAvailable)

        container.restore()
    })

    it(`
        Удаление методов конкретного пространства имён происходит корректно
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const methodService = container
            .get<IMethodService>(METHOD_SYMBOL.MethodService)
        
        const method1 = {
            namespace: 'namespace',
            type: 'type',
            name: 'name1'
        }
        const method2 = {
            namespace: 'namespace',
            type: 'type',
            name: 'name2'
        }

        await methodService.method({
            ...method1,
            handler: () => {},
            creator: {
                type: CreatorType.System
            }
        })
        await methodService.method({
            ...method2,
            handler: () => {},
            creator: {
                type: CreatorType.System
            }
        })

        await expect(methodService.removeNamespace('namespace'))
            .resolves
            .toBeUndefined()

        await expect(methodService.getMethodId(method1))
            .resolves
            .toBeUndefined()
        await expect(methodService.getMethodId(method2))
            .resolves
            .toBeUndefined()

        expect(methodService.isAvailable(method1)).toBe(false)
        expect(methodService.isAvailable(method2)).toBe(false)

        container.restore()
    })
    
    it(`
        Попытка удалить методы конкретного пространства имён приводит к исключению,
        если к методу привязан внешний ресурс через связи БД
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const testRepository = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            .then(connection => {
                return connection.getRepository(Test)
            })
        const test2Repository = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            .then(connection => {
                return connection.getRepository(Test2)
            })
        const methodRepository = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            .then(connection => {
                return connection.getRepository(Method)
            })
        const methodService = container
            .get<IMethodService>(METHOD_SYMBOL.MethodService)

        const method1 = {
            namespace: 'namespace',
            type: 'type',
            name: 'name1'
        }
        const method2 = {
            namespace: 'namespace',
            type: 'type',
            name: 'name2'
        }

        await methodService.method({
            ...method1,
            handler: () => {},
            creator: {
                type: CreatorType.System
            }
        })
        await methodService.method({
            ...method2,
            handler: () => {},
            creator: {
                type: CreatorType.System
            }
        })

        const methodObject = await methodRepository.findOne(method1)

        if (!methodObject) {
            throw new Error('Этой ошибки не должно быть')
        }

        await testRepository.save({
            method: methodObject
        })

        await expect(methodService.removeNamespace('namespace'))
            .rejects
            .toBeInstanceOf(MethodUsedError)
        await expect(methodService.getMethodId(method1))
            .resolves
            .toBeDefined()
        await expect(methodService.getMethodId(method2))
            .resolves
            .toBeDefined()

        await testRepository.clear()

        await test2Repository.save({
            method: methodObject
        })

        await expect(methodService.removeNamespace('namespace'))
            .rejects
            .toBeInstanceOf(MethodUsedError)
        await expect(methodService.getMethodId(method1))
            .resolves
            .toBeDefined()
        await expect(methodService.getMethodId(method2))
            .resolves
            .toBeDefined()

        container.restore()
    })  
        
    it(`
        Неконсисентный метод корректно выявляется
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        container.rebind(RPC_SYMBOL.RPCService)
            .to(getRPCService({
                call: async () => {
                    return [
                        {
                            result: false,
                            error: null
                        },
                        {
                            result: false,
                            error: null
                        }
                    ]
                },
                localCall: async () => {},
                method: async () => {}
            }))
            .inSingletonScope()

        const methodService = container
            .get<IMethodService>(METHOD_SYMBOL.MethodService)

        const method1 = {
            namespace: 'namespace',
            type: 'type',
            name: 'name1'
        }

        await methodService.method({
            ...method1,
            handler: () => {},
            creator: {
                type: CreatorType.System
            }
        })

        await expect(methodService.isConsistent(method1))
            .resolves
            .toBe(false)

        container.restore()
    })

    it(`
        Консистентный метод корректно выполняется
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        container.rebind(RPC_SYMBOL.RPCService)
            .to(getRPCService({
                call: async () => {
                    return [
                        {
                            result: true,
                            error: null
                        },
                        {
                            result: true,
                            error: null
                        }
                    ]
                },
                localCall: async () => {},
                method: async () => {}
            }))
            .inSingletonScope()

        const methodService = container
            .get<IMethodService>(METHOD_SYMBOL.MethodService)

        const method1 = {
            namespace: 'namespace',
            type: 'type',
            name: 'name1'
        }

        await methodService.method({
            ...method1,
            handler: () => {},
            creator: {
                type: CreatorType.System
            }
        })

        await expect(methodService.isConsistent(method1))
            .resolves
            .toBe(true)

        container.restore()
    })

    it(`
        Проверка на консистентность метода возвращает undefined, если метод недоступен
        на всех репликах приложения
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        container.rebind(RPC_SYMBOL.RPCService)
            .to(getRPCService({
                call: async () => {
                    return [
                        {
                            result: false,
                            error: null
                        },
                        {
                            result: false,
                            error: null
                        }
                    ]
                },
                localCall: async () => {},
                method: async () => {}
            }))
            .inSingletonScope()

        const methodService = container
            .get<IMethodService>(METHOD_SYMBOL.MethodService)

        const method1 = {
            namespace: 'namespace',
            type: 'type',
            name: 'name1'
        }

        await expect(methodService.isConsistent(method1))
            .resolves
            .toBeUndefined()

        container.restore()
    })

    it(`
        Попытка удалить конкретный метод приводит к исключению,
        если к методу привязан внешний ресурс через связи БД
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const testRepository = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            .then(connection => {
                return connection.getRepository(Test)
            })
        const methodRepository = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            .then(connection => {
                return connection.getRepository(Method)
            })
        const methodService = container
            .get<IMethodService>(METHOD_SYMBOL.MethodService)

        const method1 = {
            namespace: 'namespace',
            type: 'type',
            name: 'name1'
        }

        await methodService.method({
            ...method1,
            handler: () => {},
            creator: {
                type: CreatorType.System
            }
        })

        const methodObject = await methodRepository.findOne(method1)

        if (!methodObject) {
            throw new Error('Этой ошибки не должно быть')
        }

        await testRepository.save({
            method: methodObject
        })

        await expect(methodService.removeMethod(method1))
            .rejects
            .toBeInstanceOf(MethodUsedError)

        container.restore()
    })

    it(`
        Удаление конкретного метода проходит корректно
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const methodService = container
            .get<IMethodService>(METHOD_SYMBOL.MethodService)
        
        const method1 = {
            namespace: 'namespace',
            type: 'type',
            name: 'name1'
        }
        const method2 = {
            namespace: 'namespace',
            type: 'type',
            name: 'name2'
        }

        await methodService.method({
            ...method1,
            handler: () => {},
            creator: {
                type: CreatorType.System
            }
        })
        await methodService.method({
            ...method2,
            handler: () => {},
            creator: {
                type: CreatorType.System
            }
        })

        await expect(methodService.removeMethod(method1))
            .resolves
            .toBeUndefined()

        await expect(methodService.getMethodId(method1))
            .resolves
            .toBeUndefined()
        await expect(methodService.getMethodId(method2))
            .resolves
            .toBeDefined()

        expect(methodService.isAvailable(method1)).toBe(false)
        expect(methodService.isAvailable(method2)).toBe(true)

        container.restore()        
    })

    it(`
        Удаление массива переданных методов, при условии, что с ними не связан внешний ключ, происходит
        корректно
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const testRepository = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            .then(connection => {
                return connection.getRepository(Test)
            })
        const methodRepository = await container
            .get<Promise<Connection>>(TYPEORM_SYMBOL.TypeOrmConnectionApp)
            .then(connection => {
                return connection.getRepository(Method)
            })
        const methodService = container
            .get<IMethodService>(METHOD_SYMBOL.MethodService)

        const method1 = {
            namespace: 'namespace',
            type: 'type',
            name: 'name1'
        }
        const method2 = {
            namespace: 'namespace',
            type: 'type',
            name: 'name2'
        }
        const method3 = {
            namespace: 'namespace2',
            type: 'type',
            name: 'name'
        }

        await methodService.method({
            ...method1,
            handler: () => {},
            creator: {
                type: CreatorType.System
            }
        })
        await methodService.method({
            ...method2,
            handler: () => {},
            creator: {
                type: CreatorType.System
            }
        })
        await methodService.method({
            ...method3,
            handler: () => {},
            creator: {
                type: CreatorType.System
            }
        })

        const method1Entity = await methodRepository.findOne(method1)

        if (!method1Entity) {
            throw new Error('Этой ошибки не должно быть')
        }

        await testRepository.save({
            method: method1Entity
        })

        await expect(methodService.removeMethods([
            method1, method2, method3
        ])).resolves.toBeUndefined()

        await expect(methodService.getMethodId(method1))
            .resolves
            .toBeDefined()
        await expect(methodService.getMethodId(method2))
            .resolves
            .toBeUndefined()
        await expect(methodService.getMethodId(method3))
            .resolves
            .toBeUndefined()

        expect(methodService.isAvailable(method1)).toBe(true)
        expect(methodService.isAvailable(method2)).toBe(false)
        expect(methodService.isAvailable(method3)).toBe(false)

        container.restore()
    })

})
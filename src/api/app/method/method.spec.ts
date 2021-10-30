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
import { Method } from '../entities/method.entity'
import { addTestEntity } from '../../../utils/test-entities'
import { getRPCService } from '../../../core/rpc/__mock/RPCService.mock'
import { RPC_SYMBOL } from '../../../core/rpc/rpc.types'

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
addTestEntity(Test)
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
            }
        })
        await methodService.method({
            ...method2,
            handler: (boolean) => {
                handler2Fn()
                return boolean
            }
        })

        await expect(methodService.isMethod(method1))
            .resolves
            .toBe(true)
        await expect(methodService.isMethod(method2))
            .resolves
            .toBe(true)
        await expect(methodService.isMethod({
            ...method2,
            name: 'name3'
        })).resolves.toBe(false)

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
            }
        })).resolves.toBeUndefined()
        await expect(methodService.method({
            ...method1,
            handler: () => {
                handler2Fn()
                return 'xxx'
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
            handler: () => {}
        })
        await methodService.method({
            ...method2,
            handler: () => {}
        })

        await expect(methodService.removeNamespace('namespace'))
            .resolves
            .toBeUndefined()

        await expect(methodService.isMethod(method1))
            .resolves
            .toBe(false)
        await expect(methodService.isMethod(method2))
            .resolves
            .toBe(false)

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
            handler: () => {}
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
            handler: () => {}
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
            handler: () => {}
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

})
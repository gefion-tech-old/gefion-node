import { getContainer } from '../../inversify.config'
import { FASTIFY_SYMBOL } from '../fastify/fastify.types'
import { IFastifyService } from '../fastify/fastify.interface'
import { getStoreService } from './__mock/StoreService.mock'
import { RPC_SYMBOL } from './rpc.types'
import { IStoreService } from './store/store.interface'
import { getRPCService } from './__mock/RPCService.mock'
import { IRPCService } from './rpc.interface'
import { 
    ErrorInMethod,
    MoreThenOneHandlerError,
    MethodDoesNotExistsError
} from './rpc.errors'
import { InitRunner, INIT_SYMBOL } from '../init/init.types'
import { IRequestService } from './request/request.interface'
import { getRequestService } from './__mock/RequestService.mock'
import { getRPCMethod } from './__mock/RPCMethod.mock'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('RPCModule', () => {

    describe('RPCInit', () => {
        
        it(`
            Инициализация корректно запускает функции синхронизации
        `, async () => {
            const container = await getContainer()
            container.snapshot()

            const syncFn = jest.fn()

            container.rebind<IStoreService>(RPC_SYMBOL.RPCStoreService)
                .to(getStoreService({
                    getAppId: () => 'app',
                    getPorts: () => [],
                    removePort: () => {},
                    sync: () => {
                        return {
                            appId: 'app',
                            ports: [1, 2, 3, 4]
                        }
                    }
                }))
                .inSingletonScope()

            container.rebind<IRequestService>(RPC_SYMBOL.RPCRequestService)
                .to(getRequestService({
                    rpc: async () => undefined,
                    sync: async () => {
                        syncFn()
                    }
                }))

            const initRpc = container
                .getNamed<InitRunner>(INIT_SYMBOL.InitRunner, RPC_SYMBOL.RPCInit)

            await initRpc.run()

            expect(syncFn).toBeCalledTimes(4)

            container.restore()
        })
    
    })

    describe('RPCHttp', () => {

        it(`
            Конечная точка вызова rpc метода выдаёт исключение, если передавать некорректный
            идентификатор приложения или не передавать его вовсе
        `, async () => {
            const container = await getContainer()
            container.snapshot()

            const fastifyService = container
                .get<IFastifyService>(FASTIFY_SYMBOL.FastifyService)
            const fastifyInstanse = await fastifyService.fastify()

            const response = await fastifyInstanse.inject({
                method: 'post',
                url: '/api/v1/rpc',
                payload: {
                    method: 'method',
                    params: [],
                    appId: '-1'
                }
            })

            expect(response.statusCode).toBe(500)
            expect(response.json()).toMatchObject({
                error: {
                    name: 'DifferentAppIdsError'
                }
            })

            fastifyInstanse.close()
            container.restore()
        })

        it(`
            Все ошибки, которые не являются экземплярами ошибки ErrorInMethod, являются неожиданными ошибками
            и обрабатываются как полноценные ошибки, а не как корректный ответ с ошибкой #cold
        `, async () => {
            const container = await getContainer()
            container.snapshot()

            const MyError = class extends Error {
                public name = 'MyError'
                public message = 'Моя тестовая ошибка'
            }

            container.rebind<IStoreService>(RPC_SYMBOL.RPCStoreService)
                .to(getStoreService({
                    getAppId: () => 'app',
                    getPorts: () => [],
                    removePort: () => {},
                    sync: () => ({
                        appId: 'app',
                        ports: []
                    })
                }))
                .inSingletonScope()
            
            container.rebind<IRPCService>(RPC_SYMBOL.RPCService)
                .to(getRPCService({
                    method: async () => {},
                    call: async () => ([]),
                    localCall: async () => {
                        throw new MyError
                    }
                }))
                .inSingletonScope()

            const fastifyService = container
                .get<IFastifyService>(FASTIFY_SYMBOL.FastifyService)
            const fastifyInstanse = await fastifyService.fastify()

            const response = await fastifyInstanse.inject({
                method: 'post',
                url: '/api/v1/rpc',
                payload: {
                    method: 'method',
                    params: [],
                    appId: 'app'
                }
            })

            expect(response.statusCode).toBe(500)
            expect(response.json()).toMatchObject({
                error: {
                    name: 'UnexceptedRPCHandlerError',
                    error: {
                        name: new MyError().name,
                        message: new MyError().message
                    }
                }
            })

            fastifyInstanse.close()
            container.restore()
        })

        it(`
            Конечная точка вызова rpc метода выдаёт исключение, если попытаться вызвать несуществующий
            метод #cold
        `, async () => {
            const container = await getContainer()
            container.snapshot()

            container.rebind<IStoreService>(RPC_SYMBOL.RPCStoreService)
                .to(getStoreService({
                    getAppId: () => 'app',
                    getPorts: () => [],
                    removePort: () => {},
                    sync: () => ({
                        appId: 'app',
                        ports: []
                    })
                }))
                .inSingletonScope()

            const fastifyService = container
                .get<IFastifyService>(FASTIFY_SYMBOL.FastifyService)
            const fastifyInstanse = await fastifyService.fastify()

            const response = await fastifyInstanse.inject({
                method: 'post',
                url: '/api/v1/rpc',
                payload: {
                    method: 'method',
                    params: [],
                    appId: 'app'
                }
            })

            expect(response.statusCode).toBe(500)
            expect(response.json()).toMatchObject({
                error: {
                    name: 'UnexceptedRPCHandlerError',
                    error: {
                        name: 'MethodDoesNotExistsError'
                    }
                }
            })

            fastifyInstanse.close()
            container.restore()
        })

        it(`
            Ошибки, которые являются экземплярами ошибки ErrorInMethod являются ожидаемыми ошибками и
            возвращаются они как успешные ответы, а не как ошибки #cold
        `, async () => {
            const container = await getContainer()
            container.snapshot()

            const MyError = class extends Error {
                public name = 'MyError'
                public message = 'Моя тестовая ошибка'
            }

            container.rebind<IStoreService>(RPC_SYMBOL.RPCStoreService)
                .to(getStoreService({
                    getAppId: () => 'app',
                    getPorts: () => [],
                    removePort: () => {},
                    sync: () => ({
                        appId: 'app',
                        ports: []
                    })
                }))
                .inSingletonScope()

            container.rebind<IRPCService>(RPC_SYMBOL.RPCService)
                .to(getRPCService({
                    method: async () => {},
                    call: async () => ([]),
                    localCall: async () => {
                        throw new ErrorInMethod(new MyError)
                    }
                }))
                .inSingletonScope()

            const fastifyService = container
                .get<IFastifyService>(FASTIFY_SYMBOL.FastifyService)
            const fastifyInstanse = await fastifyService.fastify()

            const response = await fastifyInstanse.inject({
                method: 'post',
                url: '/api/v1/rpc',
                payload: {
                    method: 'method',
                    params: [],
                    appId: 'app'
                }
            })

            expect(response.statusCode).toBe(200)
            expect(response.json()).toMatchObject({
                error: {
                    name: 'ErrorInMethod',
                    error: {
                        name: new MyError().name,
                        message: new MyError().message
                    }
                }
            })

            fastifyInstanse.close()
            container.restore()
        })

        it(`
            Вызов rpc метода с корректными данными происходит корректно #cold
        `, async () => {
            const container = await getContainer()
            container.snapshot()

            container.rebind<IStoreService>(RPC_SYMBOL.RPCStoreService)
                .to(getStoreService({
                    getAppId: () => 'app',
                    getPorts: () => [],
                    removePort: () => {},
                    sync: () => ({
                        appId: 'app',
                        ports: []
                    })
                }))
                .inSingletonScope()

            container.rebind<IRPCService>(RPC_SYMBOL.RPCService)
                .to(getRPCService({
                    method: async () => {},
                    call: async () => ([]),
                    localCall: async () => {
                        return 'success'
                    }
                }))
                .inSingletonScope()

            const fastifyService = container
                .get<IFastifyService>(FASTIFY_SYMBOL.FastifyService)
            const fastifyInstanse = await fastifyService.fastify()

            const response = await fastifyInstanse.inject({
                method: 'post',
                url: '/api/v1/rpc',
                payload: {
                    method: 'method',
                    params: [],
                    appId: 'app'
                }
            })

            expect(response.statusCode).toBe(200)
            expect(response.json()).toMatchObject({
                result: 'success'
            })

            fastifyInstanse.close()
            container.restore()
        })

        it(`
            Конечная точка синхронизации экземпляра выдаёт исключение, если передать некорретный
            идентификатор приложения или не передавать его вовсе #cold
        `, async () => {
            const container = await getContainer()
            container.snapshot()

            const fastifyService = container
                .get<IFastifyService>(FASTIFY_SYMBOL.FastifyService)
            const fastifyInstanse = await fastifyService.fastify()

            const response = await fastifyInstanse.inject({
                method: 'post',
                url: '/api/v1/rpc/sync',
                payload: {
                    appId: 'app'
                }
            })

            expect(response.statusCode).toBe(500)
            expect(response.json()).toMatchObject({
                error: {
                    name: 'DifferentAppIdsError'
                }
            })

            fastifyInstanse.close()
            container.restore()
        })

        it(`
            Конечная точка синхронизации экземпляра корректно запускают эту самую синхронизацию #cold
        `, async () => {
            const container = await getContainer()
            container.snapshot()

            const syncFn = jest.fn()

            container.rebind<IStoreService>(RPC_SYMBOL.RPCStoreService)
                .to(getStoreService({
                    getAppId: () => 'app',
                    getPorts: () => [],
                    removePort: () => {},
                    sync: () => {
                        syncFn()
                        return {
                            appId: 'app',
                            ports: []
                        }
                    }
                }))
                .inSingletonScope()

            const fastifyService = container
                .get<IFastifyService>(FASTIFY_SYMBOL.FastifyService)
            const fastifyInstanse = await fastifyService.fastify()

            const response = await fastifyInstanse.inject({
                method: 'post',
                url: '/api/v1/rpc/sync',
                payload: {
                    appId: 'app'
                }
            })

            expect(response.statusCode).toBe(200)
            expect(syncFn).toBeCalledTimes(1)

            fastifyInstanse.close()
            container.restore()
        })

    })

    describe('RPCService', () => {

        it(`
            Попытка зарегистрировать уже зарегистрированный метод вызывает исключение #cold
        `, async () => {
            const container = await getContainer()
            container.snapshot()

            const rpcService = container
                .get<IRPCService>(RPC_SYMBOL.RPCService)

            rpcService.method('method', async () => {})

            await expect((async () => {
                rpcService.method('method', async () => {})
            })()).rejects.toBeInstanceOf(MoreThenOneHandlerError)

            container.restore()
        })

        it(`
            Попытка вызвать несуществуеющий локальный метод вызывает исключение #cold
        `, async () => {
            const container = await getContainer()
            container.snapshot()

            const rpcService = container
                .get<IRPCService>(RPC_SYMBOL.RPCService)

            await expect(
                rpcService.localCall('method', [])
            ).rejects.toBeInstanceOf(MethodDoesNotExistsError)

            container.restore()
        })

        it(`
            Зарегистрированный локальный метод корректно вызывается #cold
        `, async () => {
            const container = await getContainer()
            container.snapshot()

            const rpcService = container
                .get<IRPCService>(RPC_SYMBOL.RPCService)

            const methodFn = jest.fn()

            rpcService.method('method', async (...params: any[]) => {
                methodFn(...params)
                return true
            })

            const data = {
                one: 'test',
                two: 12,
                three: true
            }

            const result = await rpcService.localCall('method', [
                data.one,
                data.two,
                data.three
            ])

            expect(methodFn).toHaveBeenCalledTimes(1)
            expect(methodFn).toBeCalledWith(data.one, data.two, data.three)
            expect(result).toBe(true)

            container.restore()
        })

        it(`
            Исключения в зарегистрированном методе при его локальном вызове
            корректно всплывают #cold
        `, async () => {
            const container = await getContainer()
            container.snapshot()

            const rpcService = container
                .get<IRPCService>(RPC_SYMBOL.RPCService)
            const MyError = class extends Error {}

            rpcService.method('method', async () => {
                throw new MyError
            })

            await expect(rpcService.localCall('method', [])).rejects.toBeInstanceOf(MyError)

            container.restore()
        })

        it(`
            Попытка удалённо вызвать несуществующий метод приводит к исключению #cold
        `, async () => {
            const container = await getContainer()
            container.snapshot()

            const rpcService = container
                .get<IRPCService>(RPC_SYMBOL.RPCService)

            await expect(rpcService.call('method', [])).rejects.toBeInstanceOf(MethodDoesNotExistsError)

            container.restore()
        })

        it(`
            Удалённый вызов метода происходит корректно и в ответ возвращается массив
            ответов #cold
        `, async () => {
            const container = await getContainer()
            container.snapshot()

            const rpcFn = jest.fn()

            container.rebind<IStoreService>(RPC_SYMBOL.RPCStoreService)
                .to(getStoreService({
                    getAppId: () => 'app',
                    getPorts: () => [1, 2, 3, 4],
                    removePort: () => {},
                    sync: () => {
                        return {
                            appId: 'app',
                            ports: [1, 2, 3, 4]
                        }
                    }
                }))
                .inSingletonScope()

            let flag: boolean = false

            container.rebind<IRequestService>(RPC_SYMBOL.RPCRequestService)
                .to(getRequestService({
                    rpc: async (options) => {
                        rpcFn(options.params[0])
                        
                        if (flag) {
                            return {
                                result: true,
                                error: true
                            }
                        }

                        flag = true

                        return
                    },
                    sync: async () => {}
                }))

            const rpcService = container
                .get<IRPCService>(RPC_SYMBOL.RPCService)

            rpcService.method('method', async () => {})

            const result = await rpcService.call('method', [true])

            expect(result).toHaveLength(3)
            expect(result[0]).toMatchObject({
                error: true,
                result: true
            })
            expect(rpcFn).toBeCalledTimes(4)
            expect(rpcFn).lastCalledWith(true)

            container.restore()
        })

        it(`
            Если при вызове удалённого метода из фактической функции запроса на конкретный
            экземпляр будет выброшено какое-либо исключение, то порт этого экземпляра 
            будет удалён #cold
        `, async () => {
            const container = await getContainer()
            container.snapshot()

            const rpcFn = jest.fn()
            const removePortFn = jest.fn()

            container.rebind<IStoreService>(RPC_SYMBOL.RPCStoreService)
                .to(getStoreService({
                    getAppId: () => 'app',
                    getPorts: () => [1, 2, 3, 4],
                    removePort: (port) => {
                        removePortFn(port)
                    },
                    sync: () => {
                        return {
                            appId: 'app',
                            ports: [1, 2, 3, 4]
                        }
                    }
                }))
                .inSingletonScope()

            let count = 0

            container.rebind<IRequestService>(RPC_SYMBOL.RPCRequestService)
                .to(getRequestService({
                    rpc: async (options) => {
                        rpcFn(options.params[0])
                        count++

                        if (count >= 4) {
                            throw new Error()
                        }

                        return {
                            result: true,
                            error: true
                        }
                    },
                    sync: async () => {}
                }))

            const rpcService = container
                .get<IRPCService>(RPC_SYMBOL.RPCService)

            rpcService.method('method', async () => {})

            const result = await rpcService.call('method', [true])

            expect(result).toHaveLength(3)
            expect(result[0]).toMatchObject({
                error: true,
                result: true
            })
            expect(rpcFn).toBeCalledTimes(4)
            expect(rpcFn).lastCalledWith(true)
            expect(removePortFn).toBeCalledTimes(1)
            expect(removePortFn).toHaveBeenCalledWith(4)

            container.restore()
        })

    })

    it(`
        Регистрация RPC метода через контейнер в инициализационном классе проходит корректно
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const rpcFn = jest.fn()

        container.bind(RPC_SYMBOL.RPCMethod)
            .to(getRPCMethod({
                name: () => 'method',
                handler: async () => {
                    rpcFn()
                }
            }))

        const initRpc = container
            .getNamed<InitRunner>(INIT_SYMBOL.InitRunner, RPC_SYMBOL.RPCInit)

        await initRpc.run()

        const rpcService = container
            .get<IRPCService>(RPC_SYMBOL.RPCService)
        const fastifyService = container
            .get<IFastifyService>(FASTIFY_SYMBOL.FastifyService)
        const fastifyInstanse = await fastifyService.fastify()

        await rpcService.localCall('method', [true])

        expect(rpcFn).toBeCalledTimes(1)

        fastifyInstanse.close()
        container.restore()
    })

})
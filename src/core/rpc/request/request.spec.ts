import { getContainer } from '../../../inversify.config'
import { IRequestService } from './request.interface'
import { RPC_SYMBOL } from '../rpc.types'
import { IFastifyService } from '../../fastify/fastify.interface'
import { FASTIFY_SYMBOL } from '../../fastify/fastify.types'
import { IStoreService } from '../store/store.interface'
import { getStoreService } from '../__mock/StoreService.mock'
import { AddressInfo } from 'net'
import { IRPCService } from '../rpc.interface'
import { getRPCService } from '../__mock/RPCService.mock'
import { HTTPError } from 'got'
import { ErrorInMethod } from '../rpc.errors'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('RequestService в RPCModule', () => {
    
    it(`
        Запрос на синхронизацию происходит корректно
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

        const rpcRequest = container
            .get<IRequestService>(RPC_SYMBOL.RPCRequestService)
        const fastifyService = container
            .get<IFastifyService>(FASTIFY_SYMBOL.FastifyService)

        /**
         * Запускаю сервер
         */
        const fastifyInstanse = await fastifyService.fastify()

        await expect(rpcRequest.sync({
            appId: 'app',
            port: (fastifyInstanse.server.address() as AddressInfo).port
        })).resolves.toBeUndefined()
        expect(syncFn).toHaveBeenCalledTimes(1)

        fastifyInstanse.close()
        container.restore()
    })


    it(`
        Все http ошибки запроса на синхронизацию игнорируются, остальные же всплывают
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const rpcRequest = container
            .get<IRequestService>(RPC_SYMBOL.RPCRequestService)
        const fastifyService = container
            .get<IFastifyService>(FASTIFY_SYMBOL.FastifyService)

        /**
         * Запускаю сервер
         */
        const fastifyInstanse = await fastifyService.fastify()

        /**
         * Должна быть ошибка несовпадающего appId, но она игнорируется
         */
        await expect(rpcRequest.sync({
            appId: 'app',
            port: (fastifyInstanse.server.address() as AddressInfo).port
        })).resolves.toBeUndefined()

        /**
         * Попытка сделать запрос на несуществующий сервер
         */
        await expect(rpcRequest.sync({
            appId: 'app',
            port: 0
        })).rejects.toThrow()

        fastifyInstanse.close()
        container.restore()
    })

    it(`
        Запрос на вызов удалённого rpc метода происходит корректно
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const localCallFn = jest.fn()
        const MyError = class extends Error {
            public name = 'MyError'
            public message = 'MyError'
        }

        container.rebind<IRPCService>(RPC_SYMBOL.RPCService)
            .to(getRPCService({
                localCall: async (_, params) => {
                    localCallFn(params[0])
                    throw new ErrorInMethod(new MyError)
                },
                call: async () => ([]),
                method: async () => {}
            }))
            .inSingletonScope()
        
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

        const rpcRequest = container
            .get<IRequestService>(RPC_SYMBOL.RPCRequestService)
        const fastifyService = container
            .get<IFastifyService>(FASTIFY_SYMBOL.FastifyService)

        /**
         * Запускаю сервер
         */
        const fastifyInstanse = await fastifyService.fastify()

        await expect(rpcRequest.rpc({
            appId: 'app',
            method: 'method',
            params: [true],
            port: (fastifyInstanse.server.address() as AddressInfo).port
        })).resolves.toMatchObject({
            error: {
                name: 'ErrorInMethod',
                error: {
                    name: new MyError().name,
                    message: new MyError().message
                }
            },
            result: null
        })
        expect(localCallFn).toBeCalledTimes(1)
        expect(localCallFn).toHaveBeenCalledWith(true)

        fastifyInstanse.close()
        container.restore()
    })

    it(`
        Все ошибки при вызове удаленного rpc метода, за исключением неожиданных UnexceptedRPCHandlerError
        ошибок, всплывают
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const localCallFn = jest.fn()
        const MyError = class extends Error {
            public name = 'MyError'
            public message = 'MyError'
        }

        container.rebind<IRPCService>(RPC_SYMBOL.RPCService)
            .to(getRPCService({
                localCall: async (_, params) => {
                    localCallFn(params[0])
                    throw new MyError
                },
                call: async () => ([]),
                method: async () => {}
            }))
            .inSingletonScope()
        
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

        const rpcRequest = container
            .get<IRequestService>(RPC_SYMBOL.RPCRequestService)
        const fastifyService = container
            .get<IFastifyService>(FASTIFY_SYMBOL.FastifyService)

        /**
         * Запускаю сервер
         */
        const fastifyInstanse = await fastifyService.fastify()

        await expect((async () => {
            try {
                await rpcRequest.rpc({
                    appId: 'false',
                    method: 'method',
                    params: [false],
                    port: (fastifyInstanse.server.address() as AddressInfo).port
                })            
            } catch(error) {
                if (error instanceof HTTPError) {
                    const remoteError: {
                        error: {
                            name: string
                            message: string
                        }
                    } = JSON.parse(error.response.body as string)

                    throw remoteError
                }
            }
        })()).rejects.toMatchObject({
            error: {
                name: 'DifferentAppIdsError'
            }
        })
        expect(localCallFn).toBeCalledTimes(0)

        await expect(rpcRequest.rpc({
            appId: 'app',
            method: 'method',
            params: [false],
            port: 0
        })).rejects.toThrow()
        expect(localCallFn).toBeCalledTimes(0)

        await expect(rpcRequest.rpc({
            appId: 'app',
            method: 'method',
            params: [false],
            port: (fastifyInstanse.server.address() as AddressInfo).port
        })).resolves.toBeUndefined()
        expect(localCallFn).toBeCalledTimes(1)
        expect(localCallFn).toBeCalledWith(false)

        fastifyInstanse.close()
        container.restore()
    })

})
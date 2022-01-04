import { getContainer } from '../../../../inversify.config'
import { IGraphCacheService } from './graph-cache.interface'
import { SIGNAL_SYMBOL, Signal, EventType } from '../signal.type'
import { ISignalService } from '../signal.interface'
import { CREATOR_SYMBOL, CreatorType } from '../../creator/creator.types'
import { getCreatorService } from '../../creator/__mock/getCreatorService.mock'
import { RPC_SYMBOL } from '../../../../core/rpc/rpc.types'
import { getRPCService } from '../../../../core/rpc/__mock/RPCService.mock'
import { INIT_SYMBOL, InitRunner } from '../../../../core/init/init.types'
import { getGraphCacheService } from '../__mock/GraphCacheService.mock'
import { getSignalService } from '../__mock/SignalService.mock'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('GraphCacheService в SignalModule', () => {

    it(`
        Кеш сигналов корректно обновляется и считывается
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        container.rebind(RPC_SYMBOL.RPCService)
            .to(getRPCService({
                call: async () => [],
                localCall: async () => {},
                method: async () => {}
            }))

        container.rebind(CREATOR_SYMBOL.CreatorService)
            .to(getCreatorService({
                bind: async () => {},
                getCreator: async () => undefined,
                isResourceCreator: async () => false
            }))
            .inSingletonScope()

        const graphCacheService = container
            .get<IGraphCacheService>(SIGNAL_SYMBOL.GraphCacheService)
        const signalService = container
            .get<ISignalService>(SIGNAL_SYMBOL.SignalService)

        const [signal1, signal2, signal3, signal4, signal5, signal6]: Signal[] = [1, 2, 3, 4, 5, 6].map((value) => {
            return {
                name: `name${value}`,
                namespace: 'namespace'
            }
        }) as any

        await Promise.all([signal1, signal2, signal3, signal4, signal5, signal6].map(signal => {
            return signalService.create({
                creator: {
                    type: CreatorType.System
                },
                defaultMetadata: null,
                signal: signal
            })
        }))

        const [signal1Id, signal2Id, signal3Id, signal4Id, signal5Id, signal6Id]: number[] = await Promise.all([
            signalService.getSignalId(signal1),
            signalService.getSignalId(signal2),
            signalService.getSignalId(signal3),
            signalService.getSignalId(signal4),
            signalService.getSignalId(signal5),
            signalService.getSignalId(signal6),
        ]) as number[]

        const graphCallback1 = jest.fn()
        await expect(Promise.all([signal1Id, signal2Id, signal3Id, signal4Id, signal5Id, signal6Id].map(signalId => {
            return graphCacheService.signalDirection(signalId, async () => {
                graphCallback1()
                return true
            })
        }))).resolves.toEqual(
            expect.arrayContaining([false, false, false, false, false, false])
        )
        expect(graphCallback1).toBeCalledTimes(0)

        await expect(graphCacheService.updateSignals()).resolves.toBeUndefined()

        /**
         *                  
         *                                 
         *                               
         *                     1          
         *                     
         *                                2
         *             
         *        3        
         *             
         *             4       5          6
         * 
         */
        await expect(Promise.all([signal1Id, signal2Id, signal3Id, signal4Id, signal5Id, signal6Id].map(signalId => {
            return graphCacheService.signalDirection(signalId, async () => {
                graphCallback1()
                return true
            })
        }))).resolves.toEqual(
            expect.arrayContaining([true, true, true, true, true, true])
        )
        expect(graphCallback1).toBeCalledTimes(6)

        /**
         *                
         *                   
         *                                 
         *                     1           
         *                       \____>    
         *                                2
         *        
         *        3                        
         *                                 
         *             4       5          6
         * 
         */
        await expect(signalService.connect(signal1, signal2)).resolves.toBeUndefined()
        await expect(graphCacheService.updateSignal(signal1Id)).resolves.toBeUndefined()

        const graphCallback2 = jest.fn()
        await expect(graphCacheService.signalDirection(signal1Id, async (signal) => {
            graphCallback2([signal1Id, signal2Id].includes(signal.id))
            return true
        })).resolves.toBe(true)
        expect(graphCallback2).toHaveBeenNthCalledWith(1, true)
        expect(graphCallback2).toHaveBeenNthCalledWith(2, true)
        expect(graphCallback2).toBeCalledTimes(2)

        /**
         *             
         *        
         *        
         *                     1       
         *                    /  \____> 
         *                   /            2
         *                  /        
         *        3        /         
         *                 |            
         *             4<---   5          6
         * 
         */
        await expect(signalService.connect(signal1, signal4)).resolves.toBeUndefined()
        await expect(graphCacheService.updateSignal(signal1Id)).resolves.toBeUndefined()

        const graphCallback3 = jest.fn()
        await expect(graphCacheService.signalDirection(signal1Id, async (signal) => {
            graphCallback3([signal1Id, signal2Id, signal4Id].includes(signal.id))
            return true
        })).resolves.toBe(true)
        expect(graphCallback3).toHaveBeenNthCalledWith(1, true)
        expect(graphCallback3).toHaveBeenNthCalledWith(2, true)
        expect(graphCallback3).toHaveBeenNthCalledWith(3, true)
        expect(graphCallback3).toBeCalledTimes(3)

        /**
         *              
         *               
         *        
         *                     1       
         *                    /| \____>
         *                   / |          2
         *                  /  |        
         *        3        /   |      
         *                 |   V          
         *             4<---   5          6
         * 
         */
        await expect(signalService.connect(signal1, signal5)).resolves.toBeUndefined()
        await expect(graphCacheService.updateSignal(signal5Id)).resolves.toBeUndefined()

        const graphCallback4 = jest.fn()
        await expect(graphCacheService.signalDirection(signal1Id, async (signal) => {
            graphCallback4([signal1Id, signal2Id, signal4Id, signal5Id].includes(signal.id))
            return true
        })).resolves.toBe(true)
        expect(graphCallback4).toHaveBeenNthCalledWith(1, true)
        expect(graphCallback4).toHaveBeenNthCalledWith(2, true)
        expect(graphCallback4).toHaveBeenNthCalledWith(3, true)
        expect(graphCallback4).toHaveBeenNthCalledWith(4, true)
        expect(graphCallback4).toBeCalledTimes(4)

        /**
         *               
         *             
         *             
         *                     1       
         *                    /| \____>
         *                   / |       _> 2
         *                  /  |      /   
         *        3        /   |  ___/    
         *                 |   V /        
         *             4<---   5          6
         * 
         */
        await expect(signalService.connect(signal5, signal2)).resolves.toBeUndefined()
        await expect(graphCacheService.updateSignal(signal2Id)).resolves.toBeUndefined()

        const graphCallback5 = jest.fn()
        await expect(graphCacheService.signalDirection(signal1Id, async (signal) => {
            graphCallback5([signal1Id, signal2Id, signal4Id, signal5Id].includes(signal.id))
            return true
        })).resolves.toBe(true)
        expect(graphCallback5).toHaveBeenNthCalledWith(1, true)
        expect(graphCallback5).toHaveBeenNthCalledWith(2, true)
        expect(graphCallback5).toHaveBeenNthCalledWith(3, true)
        expect(graphCallback5).toHaveBeenNthCalledWith(4, true)
        expect(graphCallback5).toBeCalledTimes(4)

        /**
         *              
         *               
         *                             
         *                     1       
         *                    /| \____>
         *                   / |       _> 2
         *                  /  |      /   |
         *        3        /   |  ___/    |
         *                 |   V /        v
         *             4<---   5          6
         * 
         */
        await expect(signalService.connect(signal2, signal6)).resolves.toBeUndefined()
        await expect(graphCacheService.updateSignal(signal2Id)).resolves.toBeUndefined()

        const graphCallback6 = jest.fn()
        await expect(graphCacheService.signalDirection(signal1Id, async (signal) => {
            graphCallback6([signal1Id, signal2Id, signal4Id, signal5Id, signal6Id].includes(signal.id))
            return true
        })).resolves.toBe(true)
        expect(graphCallback6).toHaveBeenNthCalledWith(1, true)
        expect(graphCallback6).toHaveBeenNthCalledWith(2, true)
        expect(graphCallback6).toHaveBeenNthCalledWith(3, true)
        expect(graphCallback6).toHaveBeenNthCalledWith(4, true)
        expect(graphCallback6).toHaveBeenNthCalledWith(5, true)
        expect(graphCallback6).toBeCalledTimes(5)

        /**
         *                
         *                  
         *              
         *                     1      
         *                    /| \____>
         *                   / |       _> 2
         *                  /  |      /   |
         *        3        /   |  ___/    |
         *                 |   V /        v
         *             4<---   5--------->6
         * 
         */
        await expect(signalService.connect(signal5, signal6)).resolves.toBeUndefined()
        await expect(graphCacheService.updateSignal(signal5Id)).resolves.toBeUndefined()

        const graphCallback7 = jest.fn()
        await expect(graphCacheService.signalDirection(signal1Id, async (signal) => {
            graphCallback7([signal1Id, signal2Id, signal4Id, signal5Id, signal6Id].includes(signal.id))
            return true
        })).resolves.toBe(true)
        expect(graphCallback7).toHaveBeenNthCalledWith(1, true)
        expect(graphCallback7).toHaveBeenNthCalledWith(2, true)
        expect(graphCallback7).toHaveBeenNthCalledWith(3, true)
        expect(graphCallback7).toHaveBeenNthCalledWith(4, true)
        expect(graphCallback7).toHaveBeenNthCalledWith(5, true)
        expect(graphCallback7).toBeCalledTimes(5)

        /**
         *               
         *              ____________      
         *             |             \    
         *             |       1       \  
         *             |      /| \____> v 
         *             |     / |       _> 2
         *             |    /  |      /   |
         *        3    |   /   |  ___/    |
         *             |   |   V /        v
         *             4<---   5--------->6
         * 
         */
        await expect(signalService.connect(signal4, signal2)).resolves.toBeUndefined()
        await expect(graphCacheService.updateSignal(signal4Id)).resolves.toBeUndefined()

        const graphCallback8 = jest.fn()
        await expect(graphCacheService.signalDirection(signal1Id, async (signal) => {
            graphCallback8([signal1Id, signal2Id, signal4Id, signal5Id, signal6Id].includes(signal.id))
            return true
        })).resolves.toBe(true)
        expect(graphCallback8).toHaveBeenNthCalledWith(1, true)
        expect(graphCallback8).toHaveBeenNthCalledWith(2, true)
        expect(graphCallback8).toHaveBeenNthCalledWith(3, true)
        expect(graphCallback8).toHaveBeenNthCalledWith(4, true)
        expect(graphCallback8).toHaveBeenNthCalledWith(5, true)
        expect(graphCallback8).toBeCalledTimes(5)

        /**
         *         _______________________       
         *        |     ____________      |
         *        |    |             \    |
         *        |    |       1       \  |
         *        |    |      /| \____> v v
         *        |    |     / |       _> 2
         *        |    |    /  |      /   |
         *        3    |   /   |  ___/    |
         *             |   |   V /        v
         *             4<---   5--------->6
         * 
         */
        await expect(signalService.connect(signal3, signal2)).resolves.toBeUndefined()
        await expect(graphCacheService.updateSignal(signal3Id)).resolves.toBeUndefined()

        const graphCallback9 = jest.fn()
        await expect(graphCacheService.signalDirection(signal3Id, async (signal) => {
            graphCallback9([signal3Id, signal2Id, signal6Id].includes(signal.id))
            return true
        })).resolves.toBe(true)
        expect(graphCallback9).toHaveBeenNthCalledWith(1, true)
        expect(graphCallback9).toHaveBeenNthCalledWith(2, true)
        expect(graphCallback9).toHaveBeenNthCalledWith(3, true)
        expect(graphCallback9).toBeCalledTimes(3)

        const graphCallback10 = jest.fn()
        await expect(graphCacheService.signalDirection(signal1Id, async (signal) => {
            if ([signal2Id, signal5Id].includes(signal.id)) {
                return false
            }

            graphCallback10([signal1Id, signal4Id].includes(signal.id))
            return true
        })).resolves.toBe(true)
        expect(graphCallback10).toHaveBeenNthCalledWith(1, true)
        expect(graphCallback10).toHaveBeenNthCalledWith(2, true)
        expect(graphCallback10).toBeCalledTimes(2)

        const graphCallback11 = jest.fn()
        await expect(graphCacheService.signalDirection(signal3Id, async (signal) => {
            graphCallback11()
            if (signal.id === signal3Id) {
                return false
            } else {
                return true
            }
        })).resolves.toBe(true)
        expect(graphCallback11).toBeCalledTimes(1)

        await expect(graphCacheService.updateSignals()).resolves.toBeUndefined()

        const graphCallback12 = jest.fn()
        await expect(Promise.all([signal1Id, signal2Id, signal3Id, signal4Id, signal5Id, signal6Id].map(signalId => {
            return graphCacheService.signalDirection(signalId, async () => {
                graphCallback12()
                return true
            })
        }))).resolves.toEqual(
            expect.arrayContaining([true, true, true, true, true, true])
        )
        expect(graphCallback12).toBeCalledTimes(5 + 2 + 3 + 3 + 3 + 1)

        /**
         *         _______________________       
         *        |                       |
         *        |                       |
         *        |            1          |
         *        |           /           v
         *        |          /         _> 2
         *        |         /         /   |
         *        3        /      ___/    |
         *                 |     /        v
         *             4<---   5--------->6
         * 
         */
        await expect(signalService.unconnect(signal1, signal2)).resolves.toBeUndefined()
        await expect(signalService.unconnect(signal1, signal5)).resolves.toBeUndefined()
        await expect(signalService.unconnect(signal4, signal2)).resolves.toBeUndefined()
        await expect(graphCacheService.updateSignal(signal1Id)).resolves.toBeUndefined()
        await expect(graphCacheService.updateSignal(signal4Id)).resolves.toBeUndefined()

        const graphCallback13 = jest.fn()
        await expect(graphCacheService.signalDirection(signal1Id, async (signal) => {
            graphCallback13([signal1Id, signal4Id].includes(signal.id))
            return true
        })).resolves.toBe(true)
        expect(graphCallback13).toHaveBeenNthCalledWith(1, true)
        expect(graphCallback13).toHaveBeenNthCalledWith(2, true)
        expect(graphCallback13).toBeCalledTimes(2)

        /**
         *            
         *                               
         *                              
         *                     1          
         *                    /           
         *                   /        
         *                  /         
         *        3        /      
         *                 |     
         *             4<---   5--------->6
         * 
         */
        await expect(signalService.remove(signal2)).resolves.toBeUndefined()
        await expect(graphCacheService.updateSignal(signal2Id)).resolves.toBeUndefined()

        const graphCallback14 = jest.fn()
        await expect(graphCacheService.signalDirection(signal2Id, async () => {
            return true
        })).resolves.toBe(false)
        await expect(graphCacheService.signalDirection(signal3Id, async (signal) => {
            graphCallback14([signal3Id].includes(signal.id))
            return true
        })).resolves.toBe(true)
        expect(graphCallback14).toHaveBeenNthCalledWith(1, true)
        expect(graphCallback14).toBeCalledTimes(1)

        const graphCallback15 = jest.fn()
        await expect(Promise.all([signal1Id, signal2Id, signal3Id, signal4Id, signal5Id, signal6Id].map(signalId => {
            return graphCacheService.signalDirection(signalId, async () => {
                graphCallback15()
                return true
            })
        }))).resolves.toEqual(
            expect.arrayContaining([true, false, true, true, true, true])
        )
        expect(graphCallback15).toBeCalledTimes(2 + 0 + 1 + 1 + 2 + 1)

        container.restore()
    })

})

describe('GraphCacheInit в SignalModule', () => {

    it(`
        При инициализации кэш всех приложений полностью обновляется и синхронизируется
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const updateSignalsAndSyncFn = jest.fn()

        container.rebind(SIGNAL_SYMBOL.GraphCacheService)
            .to(getGraphCacheService({
                signalDirection: async () => false,
                updateSignal: async () => {},
                updateSignals: async () => {},
                updateSignalAndSync: async () => {},
                updateSignalsAndSync: async () => {
                    updateSignalsAndSyncFn()
                }
            }))
            .inSingletonScope()

        const graphCacheInit = container
            .getNamed<InitRunner>(INIT_SYMBOL.InitRunner, SIGNAL_SYMBOL.GraphCacheInit)

        await expect(graphCacheInit.run()).resolves.toBeUndefined()
        expect(updateSignalsAndSyncFn).toBeCalledTimes(1)

        container.restore()
    })

    it(`
        При инициализации корректно обновление кэша сигналов корректно привязывается к
        событиям обновления сигналов
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const updateSignalAndSyncFn = jest.fn()
        const onSignalMutationFn = jest.fn()

        container.rebind(SIGNAL_SYMBOL.GraphCacheService)
            .to(getGraphCacheService({
                signalDirection: async () => false,
                updateSignal: async () => {},
                updateSignals: async () => {},
                updateSignalAndSync: async () => {
                    updateSignalAndSyncFn()
                },
                updateSignalsAndSync: async () => {}
            }))
            .inSingletonScope()

        container.rebind(SIGNAL_SYMBOL.SignalService)
            .to(getSignalService({
                addFilter: async () => {},
                addGuard: async () => {},
                addValidator: async () => {},
                removeFilter: async () => {},
                removeGuard: async () => {},
                removeValidator: async () => {},
                isExists: async () => false,
                create: async () => {},
                getSignalId: async () => undefined,
                remove: async () => {},
                connect: async () => {},
                unconnect: async () => {},
                setCustomMetadata: async () => {},
                onSignalMutation: (handler) => {
                    onSignalMutationFn()
                    handler({
                        signalId: 1,
                        type: EventType.Create
                    })
                }
            }))
            .inSingletonScope()

        const graphCacheInit = container
            .getNamed<InitRunner>(INIT_SYMBOL.InitRunner, SIGNAL_SYMBOL.GraphCacheInit)

        await expect(graphCacheInit.run()).resolves.toBeUndefined()
        expect(onSignalMutationFn).toBeCalledTimes(1)
        expect(updateSignalAndSyncFn).toBeCalledTimes(1)

        container.restore()
    })

})
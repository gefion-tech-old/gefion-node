import { getContainer } from '../../../../inversify.config'
import { PromiseName  } from './promise.types'
import { SystemV1Name } from '../system-v1.modules'
import { 
    VM_SYMBOL, 
    VMConfig, 
    ScriptEvent,
    ScriptActivityInfo
} from '../../../../core/vm/vm.types'
import { APIPropertyEvent } from '../../../../core/vm/api-property/api-property.types'
import { IVMService } from '../../../../core/vm/vm.interface'
import { addTestInVmConfig, TestAPIProperty } from '../../__helper/test-vm-config.helper'
import path from 'path'
import { unhandledRejection } from '../../../../event-handlers'
import { 
    VMPromise,
    PromiseAddOnFulfilledStatsSegment,
    PromiseAddOnRejectedStatsSegment,
    PromiseErrorStatsSegment,
    PromiseRemoveOnFulfilledStatsSegment,
    PromiseRemoveOnRejectedStatsSegment
} from './promise.classes'
import { PromiseStats } from './promise.stats'
import { getUsedArrayBuffers } from '../../../../utils/gc'
import { ScriptError } from '../../../../core/vm/vm.errors'
import { APIPropertyError } from '../../../../core/vm/api-property/api-property.errors'
import {
    APIPropertyStats,
    APIPropertyStatsSegment
} from '../../../../core/vm/api-property/api-property.classes'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('API Promise System V1', () => {

    it(`
        Промисы успешно внедряются и соответствуют оригинальному объекту #cold
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const vmConfig = await container
            .get<Promise<VMConfig>>(VM_SYMBOL.VMConfig)
        const testObject: {
            promise1?: Promise<any>
            promise2?: Promise<any>
            promise3?: Promise<any>
            promise4?: Promise<any>
            promise5?: Promise<any>
            promise6?: Promise<any>
            promise7?: Promise<any>
            promise8?: Promise<any>
            promise9?: Promise<any>
            promise10?: Promise<any>
            promise11?: Promise<any>
            promise12?: Promise<any>
            promise13?: Promise<any>
            promise14?: Promise<any>
        } = {}
    
        container
            .rebind<Promise<VMConfig>>(VM_SYMBOL.VMConfig)
            .toDynamicValue(addTestInVmConfig(testObject, vmConfig))
            .inSingletonScope()

        const vmService = container
            .get<IVMService>(VM_SYMBOL.VMService)

        await vmService.run({
            name: 'Тестирование Promise API',
            path: path.join(__dirname, './__test/test1.js'),
            rootDir: path.join(__dirname, './__test'),
            apiProperties: [PromiseName, TestAPIProperty.name]
        })

        expect(testObject.promise1).toBeInstanceOf(VMPromise)
        expect(testObject.promise2).toBeInstanceOf(VMPromise)
        expect(testObject.promise3).toBeInstanceOf(VMPromise)
        expect(testObject.promise4).toBeInstanceOf(VMPromise)
        expect(testObject.promise5).toBeInstanceOf(VMPromise)
        expect(testObject.promise6).toBeInstanceOf(VMPromise)
        expect(testObject.promise7).toBeInstanceOf(VMPromise)
        expect(testObject.promise8).toBeInstanceOf(VMPromise)
        expect(testObject.promise9).toBeInstanceOf(VMPromise)
        expect(testObject.promise10).toBeInstanceOf(VMPromise)
        expect(testObject.promise11).toBeInstanceOf(VMPromise)
        expect(testObject.promise12).toBeInstanceOf(VMPromise)
        expect(testObject.promise13).toBeInstanceOf(VMPromise)
        expect(testObject.promise14).toBeInstanceOf(VMPromise)

        await expect(testObject.promise1).resolves.toBe(1)
        await expect(testObject.promise2).resolves.toBe(2)
        await expect(testObject.promise3).resolves.toBe(3)
        await expect(testObject.promise4).resolves.toBe(4)
        await expect(testObject.promise5).rejects.toBe(5)
        await expect(testObject.promise6).rejects.toBe(6)
        await expect(testObject.promise7).resolves.toEqual(
            expect.arrayContaining([1, 2, 3, 4])
        )
        await expect(testObject.promise8).rejects.toBe(6)
        await expect(testObject.promise9).resolves.toEqual(
            expect.arrayContaining([1, 2, 3, 4, 5, 6])
        )
        await expect(testObject.promise10).resolves.toBe(1)
        await expect(testObject.promise11).resolves.toBe(11)
        await expect(testObject.promise12).rejects.toBe(12)
        await expect(testObject.promise13).resolves.toMatchObject({
            method: 'then',
            value: 1
        })
        await expect(testObject.promise14).rejects.toBe(14)

        container.restore()
    })

    it(`
        Активные оставленные ссылки на пользовательский скрипт в промисах не дают 
        скрипту завершить свою работу, но после их удаления скрипт завершает свою работу #cold
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const vmConfig = await container
            .get<Promise<VMConfig>>(VM_SYMBOL.VMConfig)
        const testObject: {
            promise1?: Promise<any>
            promise2?: Promise<any>
            promise3?: Promise<any>
        } = {}
        
        container
            .rebind<Promise<VMConfig>>(VM_SYMBOL.VMConfig)
            .toDynamicValue(addTestInVmConfig(testObject, vmConfig))
            .inSingletonScope()

        const vmService = container
            .get<IVMService>(VM_SYMBOL.VMService)

        /**
         * Из-за того, что функция запуска скрипта асинхронная, одна вложенность 
         * then, finally и catch не удерживают ссылку, а завершают скрипт сразу. Для
         * удерживания ссылки нужно как минимум пропустить два тика событий, как это сделано
         * ниже
         */
        const scriptId1 = await vmService.run({
            name: 'Тестирование Promise API',
            path: path.join(__dirname, './__test/test2.js'),
            rootDir: path.join(__dirname, './__test'),
            apiProperties: [PromiseName, TestAPIProperty.name]
        })

        expect(vmService.info(scriptId1)?.dateEnd).toBeUndefined()
        await async function() {}
        expect(vmService.info(scriptId1)?.dateEnd).toBeInstanceOf(Date)
        await expect(testObject?.promise1).resolves.toBe(1)
        
        const scriptId2 = await vmService.run({
            name: 'Тестирование Promise API',
            path: path.join(__dirname, './__test/test3.js'),
            rootDir: path.join(__dirname, './__test'),
            apiProperties: [PromiseName, TestAPIProperty.name]
        })

        expect(vmService.info(scriptId2)?.dateEnd).toBeUndefined()
        await async function() {}
        expect(vmService.info(scriptId2)?.dateEnd).toBeInstanceOf(Date)

        const scriptId3 = await vmService.run({
            name: 'Тестирование Promise API',
            path: path.join(__dirname, './__test/test4.js'),
            rootDir: path.join(__dirname, './__test'),
            apiProperties: [PromiseName, TestAPIProperty.name]
        })

        expect(vmService.info(scriptId3)?.dateEnd).toBeUndefined()
        await async function() {}
        expect(vmService.info(scriptId3)?.dateEnd).toBeInstanceOf(Date)
        
        container.restore()
    })

    it(`
        Попытка передать в функцию then параметры отличные от функции ни к чему не
        приводят #cold
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const vmConfig = await container
            .get<Promise<VMConfig>>(VM_SYMBOL.VMConfig)
        const testObject: {
            promise1?: Promise<any>
            promise2?: Promise<any>
        } = {}
        
        container
            .rebind<Promise<VMConfig>>(VM_SYMBOL.VMConfig)
            .toDynamicValue(addTestInVmConfig(testObject, vmConfig))
            .inSingletonScope()

        const vmService = container
            .get<IVMService>(VM_SYMBOL.VMService)
            
        const scriptId = await vmService.run({
            name: 'Тестирование Promise API',
            path: path.join(__dirname, './__test/test5.js'),
            rootDir: path.join(__dirname, './__test'),
            apiProperties: [PromiseName, TestAPIProperty.name]
        })

        expect(vmService.info(scriptId)?.dateEnd).toBeInstanceOf(Date)

        await expect(testObject.promise1).resolves.toBeUndefined()
        await expect(testObject.promise2).resolves.toBeUndefined()

        container.restore()
    })

    it(`
        Скрипт полностью завершает свою работу, если промисы не держат ссылки на него,
        при услловии, что ссылок на скрипт нет и в других свойствах #cold
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const vmConfig = await container
            .get<Promise<VMConfig>>(VM_SYMBOL.VMConfig)
        const testObject: {
            promise1?: Promise<any>
            promise2?: Promise<any>
        } = {}
        
        container
            .rebind<Promise<VMConfig>>(VM_SYMBOL.VMConfig)
            .toDynamicValue(addTestInVmConfig(testObject, vmConfig))
            .inSingletonScope()

        const vmService = container
            .get<IVMService>(VM_SYMBOL.VMService)

        const scriptId = await vmService.run({
            name: 'Тестирование Promise API',
            path: path.join(__dirname, './__test/test6.js'),
            rootDir: path.join(__dirname, './__test'),
            apiProperties: [PromiseName, TestAPIProperty.name]
        })

        expect(vmService.info(scriptId)?.dateEnd).toBeInstanceOf(Date)

        await expect(testObject.promise1).resolves.toBe(1)
        await expect(testObject.promise2).rejects.toBe(1)

        container.restore()
    })

    it(`
        Полное удаление скрипта запускает сборщик ссылок и за один тик событий
        полностью их корректно и без побочных эффектов их освобождает #gc
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const vmConfig = await container
            .get<Promise<VMConfig>>(VM_SYMBOL.VMConfig)
        
        container
            .rebind<Promise<VMConfig>>(VM_SYMBOL.VMConfig)
            .toDynamicValue(addTestInVmConfig({}, vmConfig))
            .inSingletonScope()

        const vmService = container
            .get<IVMService>(VM_SYMBOL.VMService)

        const usedMemory = getUsedArrayBuffers()

        const scriptId = await vmService.run({
            name: 'Тестирование Promise API',
            path: path.join(__dirname, './__test/test7.js'),
            rootDir: path.join(__dirname, './__test'),
            apiProperties: [PromiseName, TestAPIProperty.name]
        })

        expect(vmService.info(scriptId)?.dateEnd).toBeUndefined()

        vmService.remove(scriptId)
        
        expect(vmService.info(scriptId)).toBeUndefined()
        expect(usedMemory).toBe(getUsedArrayBuffers())

        container.restore()
    })

    it(`
        Неперехваченные исключения в промисах успешно перенаправляются в событие ошибки
        свойства #cold
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const vmConfig = await container
            .get<Promise<VMConfig>>(VM_SYMBOL.VMConfig)

        const MyError = class extends Error {}

        const testObject = {
            MyError,
            log: (...args: any[]) => {
                console.log(...args)
            }
        }
        
        container
            .rebind<Promise<VMConfig>>(VM_SYMBOL.VMConfig)
            .toDynamicValue(addTestInVmConfig(testObject, vmConfig))
            .inSingletonScope()

        const vmService = container
            .get<IVMService>(VM_SYMBOL.VMService)

        /**
         * Зарегистрировать глобальные обработчики событий. Сделать это незаметно
         * от jest
         */
        const operations: {
            __jestListener: (...params: any) => void
            start: () => void
            end: () => void
        } = {
            __jestListener: () => {},
            start: () => {
                const [ listener ] = (process as any)
                    ._original()
                    .listeners('unhandledRejection')

                operations.__jestListener = listener

                ;(process as any)
                    ._original()
                    .off('unhandledRejection', listener)

                ;(process as any)._original().on('unhandledRejection', unhandledRejection)
            },

            end: () => {
                ;(process as any)
                    ._original()
                    .listeners('unhandledRejection')
                    .forEach((listener: any) => {
                        if (operations.__jestListener !== listener) {
                            ;(process as any)
                                ._original()
                                .off('unhandledRejection', listener) 
                        }
                    })

                ;(process as any)._original().on(
                    'unhandledRejection', 
                    operations.__jestListener
                )
            }
        }
        operations.start()

        const scriptId = await vmService.run({
            name: 'Тестирование Promise API',
            path: path.join(__dirname, './__test/test8.js'),
            rootDir: path.join(__dirname, './__test'),
            apiProperties: [PromiseName, TestAPIProperty.name]
        })

        const scriptInfo = vmService.info(scriptId)
        
        expect(scriptInfo?.dateEnd).toBeInstanceOf(Date)

        /**
         * Jest не хочет ждать срабатывания события unhandledRejection, который нужен
         * для теста, поэтому придётся ждать за него
         */
        await new Promise<void>(resolve => {
            let count = 0
            ;(process as any)._original().on('unhandledRejection', (reason: any, promise: any) => {
                if (promise instanceof VMPromise) {
                    count++
                    if (count === 2) {
                        resolve()
                    }
                } else {
                    operations.__jestListener(reason, promise)
                }
            })
        })
        
        expect(scriptInfo?.errors).toHaveLength(2)
        const [ error1, error2 ] = (scriptInfo as any).errors
        expect(error1).toBeInstanceOf(ScriptError)
        expect(error1.error).toBeInstanceOf(APIPropertyError)
        expect(error1.error.targetApiProperty).toMatchObject({
            name: PromiseName,
            version: SystemV1Name
        })
        expect(error1.error.error).toBeInstanceOf(MyError)

        expect(error2).toBeInstanceOf(ScriptError)
        expect(error2.error).toBeInstanceOf(APIPropertyError)
        expect(error2.error.targetApiProperty).toMatchObject({
            name: PromiseName,
            version: SystemV1Name
        })
        expect(error2.error.error).toBeInstanceOf(MyError)

        /**
         * Корректно вернуть обратно обработчик jest
         */
        operations.end()
        expect((process as any)._original().listenerCount('unhandledRejection')).toBe(1)

        container.restore()
    })

    it(`
        Событие статистики срабатывает ожидаемым образом и статистика корректно генеририруется #cold
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const vmConfig = await container
            .get<Promise<VMConfig>>(VM_SYMBOL.VMConfig)
        const testObject: {
            main?: () => void
        } = {}
        
        container
            .rebind<Promise<VMConfig>>(VM_SYMBOL.VMConfig)
            .toDynamicValue(addTestInVmConfig(testObject, vmConfig))
            .inSingletonScope()

        const vmService = container
            .get<IVMService>(VM_SYMBOL.VMService)

        const scriptId = await vmService.run({
            name: 'Тестирование Promise API',
            path: path.join(__dirname, './__test/test9.js'),
            rootDir: path.join(__dirname, './__test'),
            apiProperties: [PromiseName, TestAPIProperty.name]
        })

        const statsFn = jest.fn()
        const addOnFulfilledStatsFn = jest.fn()
        const addOnRejectedStatsFn = jest.fn()
        const removeOnFulfilledStatsFn = jest.fn()
        const removeOnRejectedStatsFn = jest.fn()

        vmService.on(scriptId, ScriptEvent.activity, (info: ScriptActivityInfo) => {
            if (info.event === APIPropertyEvent.stats) {
                const {segment, stats} = ((): {
                    segment: APIPropertyStatsSegment
                    stats: APIPropertyStats
                } => {
                    return {
                        segment: info.params[0],
                        stats: info.params[1]
                    }
                })()

                statsFn()

                if (segment instanceof PromiseAddOnFulfilledStatsSegment) {
                    addOnFulfilledStatsFn()
                }

                if (segment instanceof PromiseAddOnRejectedStatsSegment) {
                    addOnRejectedStatsFn()
                }

                if (segment instanceof PromiseRemoveOnFulfilledStatsSegment) {
                    removeOnFulfilledStatsFn()
                }

                if (segment instanceof PromiseRemoveOnRejectedStatsSegment) {
                    removeOnRejectedStatsFn()
                }

                expect(stats).toBeInstanceOf(PromiseStats)
            }
        })

        if (testObject?.main) {
            testObject.main()
        }

        expect(vmService.info(scriptId)?.dateEnd).toBeUndefined()
        await async function() {}
        await async function() {}
        expect(vmService.info(scriptId)?.dateEnd).toBeInstanceOf(Date)

        expect(statsFn).toHaveBeenCalledTimes(19)
        expect(addOnFulfilledStatsFn).toHaveBeenCalledTimes(5)
        expect(addOnRejectedStatsFn).toHaveBeenCalledTimes(4)
        expect(removeOnFulfilledStatsFn).toHaveBeenCalledTimes(6)
        expect(removeOnRejectedStatsFn).toHaveBeenCalledTimes(4)

        const stats = await vmService.stats(scriptId)
        expect(stats).not.toBeUndefined()

        if (!stats) {
            return
        }

        const promiseStats = stats.find(property => {
            return property.name === PromiseName && property.version === SystemV1Name
        })
        expect(promiseStats).not.toBeUndefined()

        if (!promiseStats) {
            return
        }

        const rawStats = promiseStats.stats.stats()
        
        expect(rawStats).toMatchObject({
            error: 0,
            onfulfilled: 0,
            onrejected: 0
        })

        container.restore()
    })

    it(`
        Статистика ошибок корректно срабатывает и обновляется #cold
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const vmConfig = await container
            .get<Promise<VMConfig>>(VM_SYMBOL.VMConfig)
        const testObject: {
            main?: () => void
        } = {}
        
        container
            .rebind<Promise<VMConfig>>(VM_SYMBOL.VMConfig)
            .toDynamicValue(addTestInVmConfig(testObject, vmConfig))
            .inSingletonScope()

        const vmService = container
            .get<IVMService>(VM_SYMBOL.VMService)

        /**
         * Зарегистрировать глобальные обработчики событий. Сделать это незаметно
         * от jest
         */
         const operations: {
            __jestListener: (...params: any) => void
            start: () => void
            end: () => void
        } = {
            __jestListener: () => {},
            start: () => {
                const [ listener ] = (process as any)
                    ._original()
                    .listeners('unhandledRejection')

                operations.__jestListener = listener

                ;(process as any)
                    ._original()
                    .off('unhandledRejection', listener)

                ;(process as any)._original().once('unhandledRejection', unhandledRejection)
            },

            end: () => {
                ;(process as any)._original().on(
                    'unhandledRejection', 
                    operations.__jestListener
                )
            }
        }
        operations.start()

        const scriptId = await vmService.run({
            name: 'Тестирование Promise API',
            path: path.join(__dirname, './__test/test10.js'),
            rootDir: path.join(__dirname, './__test'),
            apiProperties: [PromiseName, TestAPIProperty.name]
        })

        const errorStatsFn = jest.fn()

        vmService.on(scriptId, ScriptEvent.activity, (info: ScriptActivityInfo) => {
            if (info.event === APIPropertyEvent.stats) {
                const {segment, stats} = ((): {
                    segment: APIPropertyStatsSegment
                    stats: APIPropertyStats
                } => {
                    return {
                        segment: info.params[0],
                        stats: info.params[1]
                    }
                })()

                if (segment instanceof PromiseErrorStatsSegment) {
                    errorStatsFn()
                }

                expect(stats).toBeInstanceOf(PromiseStats)
            }
        })

        if (testObject?.main) {
            testObject.main()
        }

        /**
         * Jest не хочет ждать срабатывания события unhandledRejection, который нужен
         * для теста, поэтому придётся ждать за него
         */
         await new Promise<void>(resolve => {
            (process as any)._original().once('unhandledRejection', (reason: any, promise: any) => {
                if (promise instanceof VMPromise) {
                    resolve()
                } else {
                    operations.__jestListener(reason, promise)
                }
            })
        })

        expect(vmService.info(scriptId)?.dateEnd).toBeInstanceOf(Date)
        expect(errorStatsFn).toHaveBeenCalledTimes(1)

        /**
         * Корректно вернуть обратно обработчик jest
         */
        operations.end()
        expect((process as any)._original().listenerCount('unhandledRejection')).toBe(1)

        const stats = await vmService.stats(scriptId)
        expect(stats).not.toBeUndefined()

        if (!stats) {
            return
        }

        const promiseStats = stats.find(property => {
            return property.name === PromiseName && property.version === SystemV1Name
        })
        expect(promiseStats).not.toBeUndefined()

        if (!promiseStats) {
            return
        }

        const rawStats = promiseStats.stats.stats()
        
        expect(rawStats).toMatchObject({
            error: 1,
            onfulfilled: 0,
            onrejected: 0
        })

        container.restore()
    })

})
import { getContainer } from '../../../../../inversify.config'
import {
    VM_SYMBOL,
    VMConfig,
    ScriptEvent,
    ScriptActivityInfo
} from '../../../../../core/vm/vm.types'
import { IVMService } from '../../../../../core/vm/vm.interface'
import {
    SetIntervalName
} from './setInterval.types'
import { ScriptError } from '../../../../../core/vm/vm.errors'
import {
    HandlerIsNotFunction
} from './setInterval.errors'
import path from 'path'
import { 
    addTestInVmConfig,
    TestAPIProperty
} from '../../../__helper/test-vm-config.helper'
import {
    ClearIntervalName
} from '../clearInterval/clearInterval.types'
import {
    getUsedArrayBuffers
} from '../../../../../utils/gc'
import {
    APIPropertyError
} from '../../../../../core/vm/api-property/api-property.errors'
import {
    APIPropertyEvent
} from '../../../../../core/vm/api-property/api-property.types'
import {
    APIPropertyStats,
    APIPropertyStatsSegment
} from '../../../../../core/vm/api-property/api-property.classes'
import {
    SetIntervalAddActiveIntervalsStatsSegment,
    SetIntervalRemoveActiveIntervalsStatsSegment,
    SetIntervalErrorStatsSegment
} from './setInterval.classes'
import {
    SystemV1Name
} from '../../system-v1.modules'
import { SetIntervalStats } from './setInterval.stats'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('API SetInterval System V1', () => {

    it(`
        Попытка передать в качестве обработчика параметр, тип которого отличный от
        функции вызывает исключение #cold
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const vmService = container
            .get<IVMService>(VM_SYMBOL.VMService)

        const scriptId = await vmService.run({
            name: 'Тестирование SetInterval API',
            path: path.join(__dirname, './__test/test1.js'),
            rootDir: path.join(__dirname, './__test'),
            apiProperties: [SetIntervalName]
        })

        const info = vmService.info(scriptId)
        
        expect(info?.dateEnd).toBeInstanceOf(Date)
        expect(info?.errors).toHaveLength(1)

        expect(info?.errors[0]).toBeInstanceOf(ScriptError)
        expect(info?.errors[0].error).toBeInstanceOf(HandlerIsNotFunction)

        container.restore()
    })

    it(`
        Интервал успешно срабатывает через указанный промежуток времени и успешно
        отменяется с помощью clearInterval
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const vmConfig = await container
            .get<Promise<VMConfig>>(VM_SYMBOL.VMConfig)
        
        const intervalFn = jest.fn()
        const testObject = {
            intervalFn: () => {
                intervalFn()
            }
        }

        container
            .rebind<Promise<VMConfig>>(VM_SYMBOL.VMConfig)
            .toDynamicValue(addTestInVmConfig(testObject, vmConfig))
            .inSingletonScope()

        const vmService = container
            .get<IVMService>(VM_SYMBOL.VMService)

        const scriptId = await vmService.run({
            name: 'Тестирование SetInterval API',
            path: path.join(__dirname, './__test/test2.js'),
            rootDir: path.join(__dirname, './__test'),
            apiProperties: [SetIntervalName, ClearIntervalName, TestAPIProperty.name]
        })

        expect(vmService.info(scriptId)?.dateEnd).toBeUndefined()
        
        await new Promise<void>(resolve => {
            setTimeout(() => {
                resolve()
            }, 400)
        })

        expect(intervalFn).toHaveBeenCalledTimes(3)
        expect(vmService.info(scriptId)?.dateEnd).toBeInstanceOf(Date)

        container.restore()
    })

    it(`
        Насильственное освобождение ссылок корректно и полностью отменяет интервал #gc
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const vmConfig = await container
            .get<Promise<VMConfig>>(VM_SYMBOL.VMConfig)
        
        const intervalFn = jest.fn()
        const testObject = {
            intervalFn: () => {
                intervalFn()
            }
        }

        container
            .rebind<Promise<VMConfig>>(VM_SYMBOL.VMConfig)
            .toDynamicValue(addTestInVmConfig(testObject, vmConfig))
            .inSingletonScope()

        const vmService = container
            .get<IVMService>(VM_SYMBOL.VMService)
        const usedMemory = getUsedArrayBuffers()

        const scriptId = await vmService.run({
            name: 'Тестирование SetInterval API',
            path: path.join(__dirname, './__test/test3.js'),
            rootDir: path.join(__dirname, './__test'),
            apiProperties: [SetIntervalName, TestAPIProperty.name]
        })

        expect(vmService.info(scriptId)?.dateEnd).toBeUndefined()

        
        await new Promise<void>(resolve => {
            let intervalId: NodeJS.Timer
            let count = 0
            intervalId = setInterval(() => {
                count++
                if (count >= 3) {
                    resolve()
                    clearInterval(intervalId)
                }
            })
        })

        vmService.remove(scriptId)

        expect(vmService.info(scriptId)).toBeUndefined()
        expect(usedMemory).toBe(getUsedArrayBuffers())
        
        expect(intervalFn).toHaveBeenCalledTimes(6)

        container.restore()
    })

    it(`
        Ошибки в обработчике интервала успешно перехватываются и корректно всплывают #cold
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const vmConfig = await container
            .get<Promise<VMConfig>>(VM_SYMBOL.VMConfig)
        
        const eventErrorFn = jest.fn()
        const eventMyErrorFn = jest.fn()
        const MyError = class extends Error {}
        const testObject = {
            intervalFn: () => {
                throw new MyError
            }
        }

        container
            .rebind<Promise<VMConfig>>(VM_SYMBOL.VMConfig)
            .toDynamicValue(addTestInVmConfig(testObject, vmConfig))
            .inSingletonScope()

        const vmService = container
            .get<IVMService>(VM_SYMBOL.VMService)

        const scriptId = await vmService.run({
            name: 'Тестирование SetInterval API',
            path: path.join(__dirname, './__test/test4.js'),
            rootDir: path.join(__dirname, './__test'),
            apiProperties: [SetIntervalName, ClearIntervalName, TestAPIProperty.name]
        })

        vmService.on(scriptId, ScriptEvent.error, (error: ScriptError) => {
            if (error instanceof ScriptError) {
                if (error.error instanceof APIPropertyError) {
                    if (error.error.error instanceof MyError) {
                        eventMyErrorFn()
                    }
                }
            }

            eventErrorFn()
        })

        expect(vmService.info(scriptId)?.dateEnd).toBeUndefined()

        await new Promise<void>(resolve => {
            let intervalId: NodeJS.Timer
            intervalId = setInterval(() => {
                resolve()
                clearInterval(intervalId)
            })
        })

        expect(vmService.info(scriptId)?.dateEnd).toBeInstanceOf(Date)
        expect(vmService.info(scriptId)?.errors).toHaveLength(1)

        const error = vmService.info(scriptId)?.errors[0]

        expect(error).toBeInstanceOf(ScriptError)
        expect(error?.error).toBeInstanceOf(APIPropertyError)
        expect(error?.error?.error).toBeInstanceOf(MyError)

        expect(eventErrorFn).toHaveBeenCalledTimes(1)
        expect(eventMyErrorFn).toHaveBeenCalledTimes(1)

        container.restore()
    })

    it(`
        Событие статистики срабатывает ожидаемым образом и статистика корректно 
        генеририруется
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const vmConfig = await container
            .get<Promise<VMConfig>>(VM_SYMBOL.VMConfig)

        const MyError = class extends Error {}
        const testObject: {
            error: typeof MyError
            main?: () => void
        } = {
            error: MyError
        }

        container
            .rebind<Promise<VMConfig>>(VM_SYMBOL.VMConfig)
            .toDynamicValue(addTestInVmConfig(testObject, vmConfig))
            .inSingletonScope()

        const vmService = container
            .get<IVMService>(VM_SYMBOL.VMService)

        const scriptId = await vmService.run({
            name: 'Тестирование SetInterval API',
            path: path.join(__dirname, './__test/test5.js'),
            rootDir: path.join(__dirname, './__test'),
            apiProperties: [SetIntervalName, ClearIntervalName, TestAPIProperty.name]
        })

        const statsFn = jest.fn()
        const addActiveTimersStatsFn = jest.fn()
        const removeActiveTimersStatsFn = jest.fn()
        const addErrorStatsFn = jest.fn()

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

                statsFn(info.apiProperty?.name, info.apiProperty?.version)

                if (segment instanceof SetIntervalAddActiveIntervalsStatsSegment) {
                    addActiveTimersStatsFn()
                }

                if (segment instanceof SetIntervalRemoveActiveIntervalsStatsSegment) {
                    removeActiveTimersStatsFn()
                }

                if (segment instanceof SetIntervalErrorStatsSegment) {
                    addErrorStatsFn()
                }

                expect(stats).toBeInstanceOf(SetIntervalStats)
            }
        })

        if (testObject?.main) {
            testObject.main()
        }

        expect(vmService.info(scriptId)?.dateEnd).toBeUndefined()

        await new Promise<void>(resolve => {
            let intervalId: NodeJS.Timer
            intervalId = setInterval(() => {
                resolve()
                clearInterval(intervalId)
            })
        })

        expect(vmService.info(scriptId)?.dateEnd).toBeInstanceOf(Date)

        expect(statsFn).toHaveBeenCalledTimes(8)
        expect(statsFn).toHaveBeenLastCalledWith(SetIntervalName, SystemV1Name)
        expect(addActiveTimersStatsFn).toHaveBeenCalledTimes(3)
        expect(removeActiveTimersStatsFn).toHaveBeenCalledTimes(4)
        expect(addErrorStatsFn).toHaveBeenCalledTimes(1)

        const stats = await vmService.stats(scriptId)
        expect(stats).not.toBeUndefined()

        if (!stats) {
            return
        }

        const promiseStats = stats.find(property => {
            return property.name === SetIntervalName && property.version === SystemV1Name
        })
        expect(promiseStats).not.toBeUndefined()

        if (!promiseStats) {
            return
        }

        const rawStats = promiseStats.stats.stats()

        expect(rawStats).toMatchObject({
            error: 1,
            interval: 0
        })

        container.restore()
    })

})
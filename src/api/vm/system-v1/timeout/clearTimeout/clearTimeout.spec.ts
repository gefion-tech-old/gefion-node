import { getContainer } from '../../../../../inversify.config'
import { 
    VM_SYMBOL, 
    VMConfig
} from '../../../../../core/vm/vm.types'
import {
    IVMService
} from '../../../../../core/vm/vm.interface'
import {
    addTestInVmConfig,
    TestAPIProperty
} from '../../../__helper/test-vm-config.helper'
import { ClearTimeoutName } from './clearTimeout.types'
import path from 'path'
import { clearTimeoutEvent } from './clearTimeout.event'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('API ClearTimeout System V1', () => {

    it('Событие очищения таймаута успешно срабатывает #cold', async () => {
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

        const clearTimeoutEventFn = jest.fn()
        let eventScriptId: undefined | symbol
        let eventTimeoutId: undefined | symbol

        clearTimeoutEvent.on((info) => {
            clearTimeoutEventFn()
            eventScriptId = info.scriptId
            eventTimeoutId = info.timeoutId
        })

        const scriptId = await vmService.run({
            name: 'Тестирование ClearTimeout API',
            path: path.join(__dirname, './__test/test1.js'),
            rootDir: path.join(__dirname, './__test'),
            apiProperties: [ClearTimeoutName, TestAPIProperty.name]
        })

        expect(clearTimeoutEventFn).toHaveBeenCalledTimes(1)
        expect(eventScriptId).toBe(scriptId)
        expect(typeof eventTimeoutId).toBe('symbol')

        container.restore()
    })

    it('При попытке получить статистику свойства возвращается пустой объект #cold', async () => {
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

        const scriptId = await vmService.run({
            name: 'Тестирование ClearTimeout API',
            path: path.join(__dirname, './__test/test1.js'),
            rootDir: path.join(__dirname, './__test'),
            apiProperties: [ClearTimeoutName, TestAPIProperty.name]
        })

        const stats = await vmService.stats(scriptId)

        if (!stats) {
            expect(stats).not.toBeUndefined()
            return
        }

        expect(stats[0].stats).toBeInstanceOf(Object)
        expect(Object.keys(stats[0].stats)).toHaveLength(0)

        container.restore()
    })

})
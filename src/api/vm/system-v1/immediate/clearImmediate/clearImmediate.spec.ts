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
import { ClearImmediateName } from './clearImmediate.types'
import path from 'path'
import { clearImmediateEvent } from './clearImmediate.event'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('API ClearImmediate System V1', () => {

    it('Событие очищения immediate успешно срабатывает #cold', async () => {
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

        const clearImmediateEventFn = jest.fn()
        let eventScriptId: undefined | symbol
        let eventImmediateId: undefined | symbol

        clearImmediateEvent.on((info) => {
            clearImmediateEventFn()
            eventScriptId = info.scriptId
            eventImmediateId = info.immediateId
        })

        const scriptId = await vmService.run({
            name: 'Тестирование ClearImmediate API',
            path: path.join(__dirname, './__test/test1.js'),
            rootDir: path.join(__dirname, './__test'),
            apiProperties: [ClearImmediateName, TestAPIProperty.name]
        })

        expect(clearImmediateEventFn).toHaveBeenCalledTimes(1)
        expect(eventScriptId).toBe(scriptId)
        expect(typeof eventImmediateId).toBe('symbol')

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
            name: 'Тестирование ClearImmediate API',
            path: path.join(__dirname, './__test/test1.js'),
            rootDir: path.join(__dirname, './__test'),
            apiProperties: [ClearImmediateName, TestAPIProperty.name]
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
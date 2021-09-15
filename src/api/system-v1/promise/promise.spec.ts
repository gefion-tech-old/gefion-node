import { getContainer } from '../../../inversify.config'
import { VM_SYMBOL, VMConfig } from '../../../core/vm/vm.types'
import { IVMService } from '../../../core/vm/vm.interface'
import { PromiseName } from './promise.types'
import { addTestInVmConfig, TestAPIProperty } from '../../__helper/test-vm-config.helper'
import path from 'path'
import { VMPromise } from './promise.classes'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('API Promise V1', () => {

    it(`
        Промисы успешно внедряются и соответствуют оригинальному объекту
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const vmConfig = await container
            .get<Promise<VMConfig>>(VM_SYMBOL.VMConfig)
        const testObject: {
            promise1?: PromiseConstructor
            promise2?: PromiseConstructor
            promise3?: PromiseConstructor
            promise4?: PromiseConstructor
            promise5?: PromiseConstructor
            promise6?: PromiseConstructor
            promise7?: PromiseConstructor
            promise8?: PromiseConstructor
            promise9?: PromiseConstructor
            promise10?: PromiseConstructor
            promise11?: PromiseConstructor
            promise12?: PromiseConstructor
            promise13?: PromiseConstructor
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

        container.restore()
    })

    // it(`
    //     Активные оставленные ссылки на пользовательский скрипт в промисах не дают 
    //     скрипту завершить свою работу
    // `, async () => {
    //     const container = await getContainer()
    //     container.snapshot()

    //     const vmConfig = await container
    //         .get<Promise<VMConfig>>(VM_SYMBOL.VMConfig)
    //     const testObject: {
    //         promise1?: PromiseConstructor
    //     } = {}
        
    //     container
    //         .rebind<Promise<VMConfig>>(VM_SYMBOL.VMConfig)
    //         .toDynamicValue(addTestInVmConfig(testObject, vmConfig))
    //         .inSingletonScope()

    //     const vmService = container
    //         .get<IVMService>(VM_SYMBOL.VMService)

    //     const scriptId = await vmService.run({
    //         name: 'Тестирование Promise API',
    //         path: path.join(__dirname, './__test/test1.js'),
    //         rootDir: path.join(__dirname, './__test'),
    //         apiProperties: [PromiseName, TestAPIProperty.name]
    //     })

    //     console.log(vmService.info(scriptId))

    //     container.restore()
    // })

    it.todo(`
        Освобождение ссылок в промисе приводит к завершению скрипта при условии, что
        больше нигде нет ссылок на пользовательский скрипт
    `)

    it.todo(`
        Неперехваченные исключения в промисах успешно перенаправляются в событие ошибки
        свойства
    `)

    it.todo(`
        Нельзя переопределить свойства оригинального Promise по ссылкам из прототипа, а
        если и можно, то это никак не будет влиять на другие скрипты и на приложение
    `)

    it.todo(`
        Новый объект промиса полностью совместим с оригинальным объектом и наиболее
        известные его методы работают корректно
    `)

    it.todo(`
        Если освободить все ссылки до запуска функции в промисе, то функция в промисе
        не будет запущена
    `)

    it.todo(`
        Если в параметры then, finally или catch вместо функций передать не функции,
        а что-то другое, то будет выброшено исключение TypeError времени выполенния
        в результате попытки вызова переданного параметра
    `)

})
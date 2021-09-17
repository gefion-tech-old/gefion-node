import { getContainer } from '../../../inversify.config'
import { VM_SYMBOL } from '../vm.types'
import { IScriptStarterService } from './script-starter.interface'
import path from 'path'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('Сервис для запуска скриптов в виртуальной машине', () => {

    it(`
        Любая ошибка в скрипте сразу же всплывает наружу #cold
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const scriptStarter = container
            .get<IScriptStarterService>(VM_SYMBOL.ScriptStarterService)

        await expect(async () => {
            scriptStarter.runFile({
                filename: path.join(__dirname, './__test/test1.js'),
                sandbox: {},
                rootDir: path.join(__dirname, './__test')
            })
        }).rejects.toBeInstanceOf(ReferenceError)

        container.restore()
    })

    it(`
        Нельзя очевидным образом получить доступ к оригинальным свойствам родительского класса через
        цепочку прототипов внедрённого класса. Из этого следует, что нельзя переопределить поведение
        родительского класса, чтобы изменилось поведение всего приложения, которое наследуется
        от этого самого класса #cold
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const scriptStarter = container
            .get<IScriptStarterService>(VM_SYMBOL.ScriptStarterService)

        const Class1 = class {}
        const Class2 = class extends Class1 {

            public value: any = true

            test() {
                return this.value
            }

        }
        const Class3 = class extends Class2 {

            public value: any = 'no'

            test() {
                return this.value
            }

        }
        const messages: { [key: string]: any } = {}

        scriptStarter.runFile({
            filename: path.join(__dirname, './__test/test2.js'),
            sandbox: {
                Class3,
                console: {
                    log(...params: any) {
                        console.log(...params)
                    }
                },
                messages
            },
            rootDir: path.join(__dirname, './__test')
        })

        expect(messages.result1).not.toBeInstanceOf(Class3)
        expect(messages.result1).not.toBeInstanceOf(Class2)
        expect(messages.result1).not.toBeInstanceOf(Class1)

        expect(messages.result2).not.toBe(true)

        expect(messages.result3).not.toBe(true)

        container.restore()
    })

    it(`
        Запущенный скрипт не может импортировать файл, который находится вне указанной
        корневой папки #cold
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const scriptStarter = container
            .get<IScriptStarterService>(VM_SYMBOL.ScriptStarterService)

        await expect(async () => {
            scriptStarter.runFile({
                filename: path.join(__dirname, './__test/test-import/test.js'),
                sandbox: {},
                rootDir: path.join(__dirname, './__test/test-import')
            })
        }).rejects.toThrow()

        container.restore()
    })

    it(`
        Если путь к файлу или корневой директории указан некорректно, то выбрасывается
        исключение #cold
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const scriptStarter = container
            .get<IScriptStarterService>(VM_SYMBOL.ScriptStarterService)

        await expect(async () => {
            scriptStarter.runFile({
                filename: path.join(__dirname, './__test/test-import//wef////test.js'),
                sandbox: {},
                rootDir: path.join(__dirname, './__test/test-imp///ort')
            })
        }).rejects.toThrow()

        container.restore()
    })

})
import { getContainer } from '../../../inversify.config'
import { VM_SYMBOL } from '../../../core/vm/vm.types'
import { IVMService } from '../../../core/vm/vm.interface'
import path from 'path'

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
        Promise api успешно внедряется    
    `, async () => {
        const container = await getContainer()
        const vmService = container
            .get<IVMService>(VM_SYMBOL.VMService)

        await vmService.run({
            name: 'Тестирование Promise API',
            path: path.join(__dirname, './__test/index.js'),
            rootDir: path.join(__dirname, './__test'),
            apiProperties: ['Promise']
        })
    })

    it.todo(`
        Неперехваченные исключения в промисах успешно перенаправляются в событие ошибки
        свойства
    `)

    it.todo(`
        Новый объект промиса полностью совместим с оригинальным объектом и наиболее
        известные его методы работают корректно
    `)

})
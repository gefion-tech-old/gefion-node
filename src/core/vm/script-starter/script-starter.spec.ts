import { getContainer } from '../../../inversify.config'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('Сервис для запуска скриптов в виртуальной машине', () => {

    it.todo(`
        Любая ошибка в скрипте сразу же всплывает наружу
    `)

    it.todo(`
        Нельзя очевидным образом получить доступ к оригинальным свойствам прототипа внедрённых
        в песочницу объектов
    `)

    it.todo(`
        Нельзя добавлять или изменять свойства прототипов добавленных в виртуальную машину
        свойств объекта песочницы
    `)

    it.todo(`
        Запущенный скрипт не может импортировать файл, который находится вне указанной
        корневой папки
    `)

})
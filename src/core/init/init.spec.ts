import { getContainer } from '../../inversify.config'
import { INIT_SYMBOL } from './init.types'
import { IInitService } from './init.interface'
import { ReInitError, InitRunnerError } from './init.errors'
import { getInitConfig } from './__mock/InitConfig.mock'
import { getInitRunner } from './__mock/InitRunner.mock'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()

    container.rebind(INIT_SYMBOL.InitConfig)
        .toDynamicValue(getInitConfig({
            runners: []
        }))
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('Модуль инициализации', () => {
    
    it('Инициализационные задания успешно запускаются #cold', async () => {
        const container = await getContainer()
        container.snapshot()

        let runner1 = false, runner2 = false

        container.rebind(INIT_SYMBOL.InitConfig)
            .toDynamicValue(getInitConfig({
                runners: [
                    getInitRunner({
                        run: () => void (runner1 = true)
                    }),
                    getInitRunner({
                        run: () => void (runner2 = true)
                    })
                ]
            }))

        const initService = container
            .get<IInitService>(INIT_SYMBOL.InitService)

        expect(runner1).toBe(false)
        expect(runner2).toBe(false)
        
        await initService.init()

        expect(runner1).toBe(true)
        expect(runner2).toBe(true)

        container.restore()
    })

    it('Повторный запуск инициализации вызывает ошибку #cold', async () => {
        const container = await getContainer()
        container.snapshot()

        const initService = container
            .get<IInitService>(INIT_SYMBOL.InitService)

        await expect(initService.init()).resolves.toBeUndefined()
        await expect(initService.init()).rejects.toBeInstanceOf(ReInitError)

        container.restore()
    })

    it('Ошибки в заданиях выбрасываются ожидаемым образом #cold', async () => {
        const container = await getContainer()
        container.snapshot()

        let runner1 = false, runner2 = false
        const MyError = class extends Error {}

        container.rebind(INIT_SYMBOL.InitConfig)
            .toDynamicValue(getInitConfig({
                runners: [
                    getInitRunner({
                        run: () => void (runner1 = true)
                    }),
                    getInitRunner({
                        run: () => {
                            throw new MyError
                        }
                    }),
                    getInitRunner({
                        run: () => void (runner2 = true)
                    }),
                ]
            }))

        const initService = container
            .get<IInitService>(INIT_SYMBOL.InitService)

        {
            const initFunc = initService.init()
    
            await expect(initFunc).rejects.toBeInstanceOf(InitRunnerError)
            await expect(async () => {
                try {
                    await initFunc
                } catch(error) {
                    throw (error as any).error
                }
            }).rejects.toBeInstanceOf(MyError)
        }
        
        expect(runner1).toBe(true)
        expect(runner2).toBe(false)

        container.restore()
    })

})
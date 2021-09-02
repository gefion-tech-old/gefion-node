import { getContainer } from '../../inversify.config'
import { INIT_SYMBOL, InitConfig, InitRunner } from './init.types'
import { IInitService } from './init.interface'
import { ReInitError, InitRunnerError } from './init.errors'

class Runner implements InitRunner {

    public constructor(
        private fn: () => Promise<void>
    ) {}

    public async run(): Promise<void> {
        await this.fn()
    }

}

class MyError extends Error {}

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()

    container.rebind(INIT_SYMBOL.InitConfig)
        .toDynamicValue(async (): Promise<InitConfig> => {
            return {
                runners: [
                    new Runner(async () => void ('')),
                    new Runner(async () => void (''))
                ]
            }
        })
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
            .toDynamicValue(async (): Promise<InitConfig> => {
                return {
                    runners: [
                        new Runner(async () => void (runner1 = true)),
                        new Runner(async () => void (runner2 = true))
                    ]
                }
            })

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

        container.rebind(INIT_SYMBOL.InitConfig)
            .toDynamicValue(async (): Promise<InitConfig> => {
                return {
                    runners: [
                        new Runner(async () => void (runner1 = true)),
                        new Runner(async () => {
                            throw new MyError
                        }),
                        new Runner(async () => void (runner2 = true))
                    ]
                }
            })

        const initService = container
            .get<IInitService>(INIT_SYMBOL.InitService)

        const initFunc = initService.init()
        await expect(initFunc).rejects.toBeInstanceOf(InitRunnerError)
        await expect(async () => {
            try {
                await initFunc
            } catch(error: any) {
                throw error.error
            }
        }).rejects.toBeInstanceOf(MyError)
        
        expect(runner1).toBe(true)
        expect(runner2).toBe(false)

        container.restore()
    })

})
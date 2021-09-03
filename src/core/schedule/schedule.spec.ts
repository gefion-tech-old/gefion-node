import { getContainer } from '../../inversify.config'
import { SCHEDULE_SYMBOL } from './schedule.types'
import { IncorrectRecurrence } from './schedule.errors'
import { IScheduleService } from './schedule.interface'
import { Buffer } from 'buffer'
import { getUsedArrayBuffers } from '../../utils/gc'
import { getScheduleConfig } from './__mock/ScheduleConfig.mock'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()

    container.rebind(SCHEDULE_SYMBOL.ScheduleConfig)
        .toDynamicValue(getScheduleConfig({
            jobs: []
        }))
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('Сервис планирования заданий', () => {

    it('Одноразовое задание успешно инициализируется и выполняется', async () => {
        const container = await getContainer()
        container.snapshot()

        const scheduleService = container
            .get<IScheduleService>(SCHEDULE_SYMBOL.ScheduleService)
        
        const name = Symbol('Задание')
        const job = jest.fn()
        const date = new Date().getTime() + 100

        expect(scheduleService.has(name)).toBe(false)

        scheduleService.schedule(name, date, job)
        
        expect(scheduleService.has(name)).toBe(true)
        expect(job).not.toHaveBeenCalled()

        await ((): Promise<void> => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve()
                }, 10)
            })
        })()

        expect(job).not.toHaveBeenCalled()

        await ((): Promise<void> => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve()
                }, 100)
            })
        })()

        expect(job).toHaveBeenCalled()
        expect(scheduleService.has(name)).toBe(false)

        container.restore()
    })

    it('Нельзя запланировать задание на уже прошедшую дату #cold', async () => {
        const container = await getContainer()
        container.snapshot()

        const scheduleService = container
            .get<IScheduleService>(SCHEDULE_SYMBOL.ScheduleService)

        const name = Symbol('Задание');

        await expect(async () => {
            scheduleService.schedule(name, new Date().getTime() - 100, () => {})
        }).rejects.toBeInstanceOf(IncorrectRecurrence)
        expect(scheduleService.has(name)).toBe(false)

        container.restore()
    })
    
    it('Одноразовое задание само удаляется после выполнения #gc', async () => {
        const container = await getContainer()
        container.snapshot()

        const scheduleService = container
            .get<IScheduleService>(SCHEDULE_SYMBOL.ScheduleService)

        const name = Symbol('Задание');
        const bufferSize = 30 * 1024 * 1024

        const usedMemory = await new Promise<number>((resolve) => {
            let buffer = Buffer.allocUnsafe(bufferSize)
            let usedMemory = getUsedArrayBuffers()

            scheduleService.schedule(name, new Date().getTime() + 100, function() {
                void buffer
                resolve(usedMemory)
            })
        })

        expect(usedMemory).toBeGreaterThan(getUsedArrayBuffers() + bufferSize * 0.9)

        container.restore()
    })

    it('Долгоживущее задание успешно инициализируется и выполняется', async () => {
        const container = await getContainer()
        container.snapshot()

        const scheduleService = container
            .get<IScheduleService>(SCHEDULE_SYMBOL.ScheduleService)

        const name = Symbol('Задание')

        await new Promise<void>((resolve) => {
            let index = 0

            scheduleService.schedule(name, { second: (null as any) }, function() {
                if (++index >= 2) {
                    resolve()
                }
            })
        })

        const stats = scheduleService.stats(name)
        scheduleService.remove(name)

        expect(stats).toBeInstanceOf(Object)
        expect(stats?.error).toEqual(0)
        expect(stats?.run).toEqual(2)

        container.restore()
    }, 3000)

    it('Долгоживущее задание может быть полностью удалено #gc', async () => {
        const container = await getContainer()
        container.snapshot()

        const scheduleService = container
            .get<IScheduleService>(SCHEDULE_SYMBOL.ScheduleService)

        const name = Symbol('Задание')
        const bufferSize = 30 * 1024 * 1024

        const usedMemory = ((): number => {
            const buffer = Buffer.allocUnsafe(bufferSize)
    
            scheduleService.schedule(name, { second: (null as any) }, function() {
                void buffer
            })

            return getUsedArrayBuffers()
        })()

        scheduleService.remove(name)
        
        expect(scheduleService.has(name)).toBe(false)
        expect(usedMemory).toBeGreaterThan(getUsedArrayBuffers() + bufferSize * 0.9)

        container.restore()
    })

    it('Существующее задание можно вызвать напрямую #cold', async () => {
        const container = await getContainer()
        container.snapshot()

        const scheduleService = container
            .get<IScheduleService>(SCHEDULE_SYMBOL.ScheduleService)

        const name = Symbol('Задание')
        const job = jest.fn()

        scheduleService.schedule(name, new Date().getTime() + 100, job)

        expect(job).not.toHaveBeenCalled()

        scheduleService.invoke(name)

        expect(job).toHaveBeenCalled()

        const stats = scheduleService.stats(name)
        scheduleService.remove(name)

        expect(stats).toBeInstanceOf(Object)
        expect(stats?.run).toEqual(1)

        container.restore()
    })

    it('Одноразовое задание корректно обрабатывает ошибки', async () => {
        const container = await getContainer()
        container.snapshot()

        const scheduleService = container
            .get<IScheduleService>(SCHEDULE_SYMBOL.ScheduleService)

        const name = Symbol('Задание')
        const MyError = class extends Error {}

        scheduleService.schedule(name, new Date().getTime() + 100, function() {
            throw new MyError
        })

        scheduleService.invoke(name)
        
        expect(scheduleService.stats(name)?.error).toEqual(1)

        scheduleService.remove(name)

        container.restore()
    })

    it('Долгоживущее задание корректно обрабатывает ошибки', async () => {
        const container = await getContainer()
        container.snapshot()

        const scheduleService = container
            .get<IScheduleService>(SCHEDULE_SYMBOL.ScheduleService)
            
        const name = Symbol('Задание')

        scheduleService.schedule(name, { second: (null as any) }, function() {
            throw new Error
        })

        await new Promise((resolve) => {
            setTimeout(resolve, 1100)
        })
        
        const stats = scheduleService.stats(name)
        scheduleService.remove(name)
        
        expect(stats?.error).toEqual(1)

        container.restore()
    })

})
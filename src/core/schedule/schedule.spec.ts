import { getContainer } from '../../inversify.config'
import { SCHEDULE_SYMBOL } from './schedule.types'
import { IncorrectRecurrence } from './schedule.errors'
import { IScheduleService } from './schedule.interface'
import { Buffer } from 'buffer'

function getUsedMemory() {
    (global as any).gc()
    return process.memoryUsage().arrayBuffers
}

describe('Сервис планирования заданий', () => {

    it('Одноразовое задание успешно инициализируется и выполняется', async () => {
        const container = await getContainer()
        const scheduleService = container
            .get<IScheduleService>(SCHEDULE_SYMBOL.ScheduleService)
        const name = Symbol.for('Задание')

        const job = new Promise<number>((resolve) => {
            const date = new Date().getTime() + 100

            scheduleService.schedule(name, date, function() {
                resolve(date)
            })
        })

        expect(scheduleService.has(name)).toBe(true)

        const date = await job

        expect(new Date().getTime()).toBeGreaterThanOrEqual(date)
        expect(scheduleService.has(name)).toBe(false)
    })

    it('Нельзя запланировать задание на уже прошедшую дату #cold', async () => {
        const container = await getContainer()
        const scheduleService = container
            .get<IScheduleService>(SCHEDULE_SYMBOL.ScheduleService)
        const name = Symbol.for('Задание');

        expect(() => {
            scheduleService.schedule(name, new Date().getTime() - 100, () => {})
        }).toThrowError(IncorrectRecurrence)
    })
    
    it('Одноразовое задание само удаляется после выполнения #gc', async () => {
        const container = await getContainer()
        const scheduleService = container
            .get<IScheduleService>(SCHEDULE_SYMBOL.ScheduleService)
        const name = Symbol.for('Задание');
        
        const bufferSize = 30 * 1024 * 1024

        const usedMemory = await new Promise<number>((resolve) => {
            let buffer = Buffer.allocUnsafe(bufferSize)
            let usedMemory = getUsedMemory()

            scheduleService.schedule(name, new Date().getTime() + 100, function() {
                void buffer
                resolve(usedMemory)
            })
        })

        expect(usedMemory).toBeGreaterThan(getUsedMemory() + bufferSize * 0.9)
    })

    it('Долгоживущее задание успешно инициализируется и выполняется', async () => {
        const container = await getContainer()
        const scheduleService = container
            .get<IScheduleService>(SCHEDULE_SYMBOL.ScheduleService)
        const name = Symbol.for('Задание')

        const job = new Promise<void>((resolve) => {
            let index = 0

            scheduleService.schedule(name, { second: (null as any) }, function() {
                if (++index >= 2) {
                    resolve()
                }
            })
        })
        
        await job 
        const stats = scheduleService.stats(name)
        scheduleService.remove(name)

        expect(stats).toBeInstanceOf(Object)
        expect(stats?.error).toEqual(0)
        expect(stats?.run).toEqual(2)
    }, 3000)

    it('Долгоживущее задание может быть полностью удалено #gc', async () => {
        const container = await getContainer()
        const scheduleService = container
            .get<IScheduleService>(SCHEDULE_SYMBOL.ScheduleService)
        const name = Symbol.for('Задание')

        const bufferSize = 30 * 1024 * 1024

        const usedMemory = await new Promise<number>((resolve) => {
            let buffer = Buffer.allocUnsafe(bufferSize)
            let usedMemory = getUsedMemory()
            
            scheduleService.schedule(name, { second: (null as any) }, function() {
                void buffer
                resolve(usedMemory)
            })
        })
        scheduleService.remove(name)
        
        expect(scheduleService.has(name)).toBe(false)
        expect(usedMemory).toBeGreaterThan(getUsedMemory() + bufferSize * 0.9)
    })

    it('Существующее задание можно вызвать напрямую #cold', async () => {
        const container = await getContainer()
        const scheduleService = container
            .get<IScheduleService>(SCHEDULE_SYMBOL.ScheduleService)
        const name = Symbol.for('Задание')

        const job = new Promise<number>((resolve) => {
            const date = new Date().getTime() + 100
    
            scheduleService.schedule(name, date, function() {
                resolve(date)
            })
        })

        scheduleService.invoke(name)

        const date = await job
        const stats = scheduleService.stats(name)
        scheduleService.remove(name)

        expect(date).toBeGreaterThan(new Date().getTime())
        expect(stats).toBeInstanceOf(Object)
        expect(stats?.run).toEqual(1)
    })

    it('Одноразовое задание корректно обрабатывает ошибки', async () => {
        const container = await getContainer()
        const scheduleService = container
            .get<IScheduleService>(SCHEDULE_SYMBOL.ScheduleService)
        const name = Symbol.for('Задание')

        const job = new Promise((_, reject) => {
            scheduleService.schedule(name, new Date().getTime() + 100, function() {
                reject(new Error)
                throw new Error
            })
        })

        scheduleService.invoke(name)
        
        await expect(job).rejects.toThrowError(Error)
        expect(scheduleService.stats(name)?.error).toEqual(1)

        scheduleService.remove(name)
    }, 10 * 10000)

    it('Долгоживущее задание корректно обрабатывает ошибки', async () => {
        const container = await getContainer()
        const scheduleService = container
            .get<IScheduleService>(SCHEDULE_SYMBOL.ScheduleService)
        const name = Symbol.for('Задание')

        scheduleService.schedule(name, { second: (null as any) }, function() {
            throw new Error
        })

        await new Promise((resolve) => {
            setTimeout(resolve, 1100)
        })
        
        const stats = scheduleService.stats(name)
        scheduleService.remove(name)
        
        expect(stats?.error).toEqual(1)
    })

})
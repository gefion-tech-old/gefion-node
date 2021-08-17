import { getContainer } from '../../inversify.config'
import { ATOMIC_SYMBOL } from './atomic.types'
import { IAtomicService } from './atomic.interface'
import { getUsedArrayBuffers } from '../../utils/gc'
import { Buffer } from 'buffer'

describe('Сервис атомарных операций', () => {

    it('Операция успешно блокируется и разблокируется', async () => {
        const container = await getContainer()
        const atomicService = container
            .get<IAtomicService>(ATOMIC_SYMBOL.AtomicService)
        const operation = 'Operation1'

        expect(await atomicService.check(operation)).toBe(false)
        expect(await atomicService.lock(operation)).toBe(true)
        expect(await atomicService.check(operation, { retries: 1 })).toBe(true)
        
        await atomicService.unlock(operation)

        expect(await atomicService.check(operation)).toBe(false)
    })

    it('Неудачная попытка блокировки успешно обрабатывается', async () => {
        const container = await getContainer()
        const atomicService = container
            .get<IAtomicService>(ATOMIC_SYMBOL.AtomicService)
        const operation = 'Operation2'

        expect(await atomicService.lock(operation)).toBe(true)
        expect(await atomicService.lock(operation, { retries: 1 })).toBe(false)
        expect(await atomicService.check(operation, { retries: 1 })).toBe(true)
        
        await atomicService.unlock(operation)

        expect(await atomicService.check(operation)).toBe(false)
    })

    it('Ссылки на объект опций успешно освобождаются в методах lock и check #gc', async () => {
        const container = await getContainer()
        const atomicService = container
            .get<IAtomicService>(ATOMIC_SYMBOL.AtomicService)
        const operation = 'Operation3'

        const bufferSize = 30 * 1024 * 1024
        
        await expect(await (async (): Promise<number> => {
            const buffer = Buffer.allocUnsafe(bufferSize)
            const usedMemory = getUsedArrayBuffers()

            await atomicService.lock(operation, ({
                retries: 1,
                ef: buffer
            } as any))

            return usedMemory
        })()).toBeGreaterThan(getUsedArrayBuffers() + bufferSize * 0.9)

        await expect(await (async (): Promise<number> => {
            const buffer = Buffer.allocUnsafe(bufferSize)
            const usedMemory = getUsedArrayBuffers()

            await atomicService.check(operation, ({
                retries: 1,
                ef: buffer
            } as any))

            return usedMemory
        })()).toBeGreaterThan(getUsedArrayBuffers() + bufferSize * 0.9)
    })

})
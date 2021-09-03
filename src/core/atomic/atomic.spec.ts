import { getContainer } from '../../inversify.config'
import { ATOMIC_SYMBOL } from './atomic.types'
import { IAtomicService } from './atomic.interface'
import { getUsedArrayBuffers } from '../../utils/gc'
import { Buffer } from 'buffer'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('Сервис атомарных операций', () => {

    it('Операция успешно блокируется и разблокируется', async () => {
        const container = await getContainer()
        const atomicService = container
            .get<IAtomicService>(ATOMIC_SYMBOL.AtomicService)
        const operation = 'Operation1'

        await expect(atomicService.check(operation)).resolves.toBe(false)
        await expect(atomicService.lock(operation)).resolves.toBe(true)
        await expect(atomicService.check(operation, { retries: 1 })).resolves.toBe(true)
        
        await atomicService.unlock(operation)

        await expect(atomicService.check(operation)).resolves.toBe(false)
    })

    it('Неудачная попытка блокировки успешно обрабатывается', async () => {
        const container = await getContainer()
        const atomicService = container
            .get<IAtomicService>(ATOMIC_SYMBOL.AtomicService)
        const operation = 'Operation2'

        await expect(atomicService.lock(operation)).resolves.toBe(true)
        await expect(atomicService.lock(operation, { retries: 1 })).resolves.toBe(false)
        await expect(atomicService.check(operation, { retries: 1 })).resolves.toBe(true)
        
        await atomicService.unlock(operation)

        await expect(atomicService.check(operation)).resolves.toBe(false)
    })

    it('Ссылки на объект опций успешно освобождаются в методах lock и check #gc', async () => {
        const container = await getContainer()
        const atomicService = container
            .get<IAtomicService>(ATOMIC_SYMBOL.AtomicService)
        const operation = 'Operation3'

        const bufferSize = 30 * 1024 * 1024
        
        {
            const usedMemory = await (async (): Promise<number> => {
                const buffer = Buffer.allocUnsafe(bufferSize)
                const usedMemory = getUsedArrayBuffers()
    
                await atomicService.lock(operation, ({
                    retries: 1,
                    ef: buffer
                } as any))
    
                return usedMemory
            })()

            expect(usedMemory).toBeGreaterThan(getUsedArrayBuffers() + bufferSize * 0.9)
        }

        {
            const usedMemory = await (async (): Promise<number> => {
                const buffer = Buffer.allocUnsafe(bufferSize)
                const usedMemory = getUsedArrayBuffers()
    
                await atomicService.check(operation, ({
                    retries: 1,
                    ef: buffer
                } as any))
    
                return usedMemory
            })()

            expect(usedMemory).toBeGreaterThan(getUsedArrayBuffers() + bufferSize * 0.9)
        }
    })

})
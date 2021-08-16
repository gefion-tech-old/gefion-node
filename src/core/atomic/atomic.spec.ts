import { getContainer } from '../../inversify.config'
import { ATOMIC_SYMBOL } from './atomic.types'
import { IAtomicService } from './atomic.interface'

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

})
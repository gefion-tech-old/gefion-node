import { getContainer } from '../../../inversify.config'
import { ATOMIC_SYMBOL, AtomicConfig } from '../atomic.types'
import { IAtomicService } from '../atomic.interface'
import { ILockCollectorService } from './lock-collector.interface'

describe('Сервис для сборки устаревших блокировок', () => {

    it('Устаревшие блокировки успешно собираются', async () => {
        const container = await getContainer()
        
        container.snapshot()

        container.rebind(ATOMIC_SYMBOL.AtomicConfig)
            .toDynamicValue(async (): Promise<AtomicConfig> => {
                return {
                    lockExpires: 0
                }
            })

        const atomicService = container
            .get<IAtomicService>(ATOMIC_SYMBOL.AtomicService)
        const lockCollector = container
            .get<ILockCollectorService>(ATOMIC_SYMBOL.LockCollectorService)
        
            
        const operation = 'Operation1'

        expect(await atomicService.check(operation, { retries: 1 })).toBe(false)
        expect(await atomicService.lock(operation)).toBe(true)
        expect(await atomicService.check(operation, { retries: 1 })).toBe(true)
        
        await lockCollector.run()

        expect(await atomicService.check(operation, { retries: 1 })).toBe(false)
        
        container.restore()
    })

})
import { injectable, inject, named } from 'inversify'
import { IAtomicService } from './atomic.interface'
import { Options } from 'async-retry'
import { ASYNC_RETRY_SYMBOL } from '../../dep/async-retry/async-retry.types'
import asyncRetry from 'async-retry'
import { TYPEORM_SYMBOL } from '../../dep/typeorm/typeorm.types'
import { ATOMIC_SYMBOL } from './atomic.types'
import { Repository } from 'typeorm'
import { Atomic } from './entities/atomic.entity'

@injectable()
export class AtomicService implements IAtomicService {

    public constructor(
        @inject(ASYNC_RETRY_SYMBOL.AsyncRetry)
        private retry: typeof asyncRetry,

        @inject(TYPEORM_SYMBOL.TypeOrmAppRepository)
        @named(ATOMIC_SYMBOL.AtomicRepository)
        private atomicRepository: Promise<Repository<Atomic>>
    ) {}

    public async lock(operation: string, options?: Options): Promise<boolean> {
        const atomicRepository = await this.atomicRepository

        try {
            await this.retry(async () => {
                await atomicRepository.insert({
                    operation: operation
                })    
            }, options)
        } catch {
            return false
        }

        return true
    }

    public async unlock(operation: string): Promise<void> {
        const atomicRepository = await this.atomicRepository
        await atomicRepository.delete(operation)
    }

    public async check(operation: string, options?: Options): Promise<boolean> {
        const atomicRepository = await this.atomicRepository

        try {
            await this.retry(async () => {
                const atomic = await atomicRepository.findOne({
                    where: {
                        operation: operation
                    }
                })

                if (atomic) {
                    throw new Error('Операция заблокирована')
                }

                return
            }, options)
        } catch {
            return true
        }

        return false
    }

} 
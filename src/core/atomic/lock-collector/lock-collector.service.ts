import { injectable, inject, named } from 'inversify'
import { ILockCollectorService } from './lock-collector.interface'
import { Atomic } from '../entities/atomic.entity'
import { Repository, LessThanOrEqual } from 'typeorm'
import { TYPEORM_SYMBOL } from '../../../dep/typeorm/typeorm.types'
import { ATOMIC_SYMBOL, AtomicConfig } from '../atomic.types'
import { getSqliteDateFormat } from '../../../utils/date-format'

@injectable()
export class LockCollectorService implements ILockCollectorService {

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmAppRepository)
        @named(ATOMIC_SYMBOL.AtomicRepository)
        private atomicRepository: Promise<Repository<Atomic>>,

        @inject(ATOMIC_SYMBOL.AtomicConfig)
        private config: Promise<AtomicConfig>
    ) {}

    public async run(): Promise<void> {
        const config = await this.config
        const atomicRepository = await this.atomicRepository
        const dateExpires = new Date(
            new Date().getTime() - config.lockExpires
        )

        await atomicRepository.delete({
            createdAt: LessThanOrEqual(getSqliteDateFormat(dateExpires))
        })
    }

}
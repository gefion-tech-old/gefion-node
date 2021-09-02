import { injectable, inject } from 'inversify'
import { ILockCollectorService } from './lock-collector.interface'
import { Atomic } from '../entities/atomic.entity'
import { Repository, LessThanOrEqual, Connection } from 'typeorm'
import { TYPEORM_SYMBOL } from '../../typeorm/typeorm.types'
import { ATOMIC_SYMBOL, AtomicConfig } from '../atomic.types'
import { getSqliteDateFormat } from '../../../utils/date-format'

@injectable()
export class LockCollectorService implements ILockCollectorService {

    private atomicRepository: Promise<Repository<Atomic>>

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        connection: Promise<Connection>,

        @inject(ATOMIC_SYMBOL.AtomicConfig)
        private config: Promise<AtomicConfig>
    ) {
        this.atomicRepository = connection
            .then((connection) => {
                return connection.getRepository(Atomic)
            })
    }

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
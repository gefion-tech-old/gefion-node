import { injectable, inject } from 'inversify'
import { ILockCollectorService } from './lock-collector.interface'
import { Atomic } from '../entities/atomic.entity'
import { LessThanOrEqual, Connection } from 'typeorm'
import { TYPEORM_SYMBOL } from '../../typeorm/typeorm.types'
import { ATOMIC_SYMBOL, AtomicConfig } from '../atomic.types'
import { getSqliteDateFormat } from '../../../utils/date-format'
import { mutationQuery } from '../../typeorm/utils/mutation-query'

@injectable()
export class LockCollectorService implements ILockCollectorService {

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        private connection: Promise<Connection>,

        @inject(ATOMIC_SYMBOL.AtomicConfig)
        private config: Promise<AtomicConfig>
    ) {}

    public async run(): Promise<void> {
        const config = await this.config
        const connection = await this.connection
        const atomicRepository = connection.getRepository(Atomic)
        const dateExpires = new Date(
            new Date().getTime() - config.lockExpires
        )

        await mutationQuery(false, () => {
            return atomicRepository.delete({
                createdAt: LessThanOrEqual(getSqliteDateFormat(dateExpires))
            })
        })
    }

}
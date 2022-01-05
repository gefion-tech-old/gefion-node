import { injectable, inject } from 'inversify'
import { IAtomicService } from './atomic.interface'
import { Options } from 'async-retry'
import retry from 'async-retry'
import { TYPEORM_SYMBOL } from '../typeorm/typeorm.types'
import { Connection } from 'typeorm'
import { Atomic } from './entities/atomic.entity'
import { mutationQuery } from '../typeorm/utils/mutation-query'

@injectable()
export class AtomicService implements IAtomicService {

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        private connection: Promise<Connection>
    ) {}

    public async lock(operation: string, options?: Options): Promise<boolean> {
        const connection = await this.connection
        const atomicRepository = connection.getRepository(Atomic)

        try {
            await retry(async () => {
                await mutationQuery(false, () => {
                    return atomicRepository.insert({
                        operation: operation
                    }) 
                })  
            }, options)
        } catch {
            return false
        }

        return true
    }

    public async unlock(operation: string): Promise<void> {
        const connection = await this.connection
        const atomicRepository = connection.getRepository(Atomic)

        await mutationQuery(false, () => {
            return atomicRepository.delete(operation)
        })
    }

    public async check(operation: string, options?: Options): Promise<boolean> {
        const connection = await this.connection
        const atomicRepository = connection.getRepository(Atomic)

        try {
            await retry(async () => {
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
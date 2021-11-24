import { injectable, inject } from 'inversify'
import { IAtomicService } from './atomic.interface'
import { Options } from 'async-retry'
import retry from 'async-retry'
import { TYPEORM_SYMBOL } from '../typeorm/typeorm.types'
import { Repository, Connection } from 'typeorm'
import { Atomic } from './entities/atomic.entity'
import { mutationQuery } from '../typeorm/utils/mutation-query'

@injectable()
export class AtomicService implements IAtomicService {

    private atomicRepository: Promise<Repository<Atomic>>

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        connection: Promise<Connection>
    ) {
        this.atomicRepository = connection
            .then((connection) => {
                return connection.getRepository(Atomic)
            })
    }

    public async lock(operation: string, options?: Options): Promise<boolean> {
        const atomicRepository = await this.atomicRepository

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
        const atomicRepository = await this.atomicRepository
        await mutationQuery(false, () => {
            return atomicRepository.delete(operation)
        })
    }

    public async check(operation: string, options?: Options): Promise<boolean> {
        const atomicRepository = await this.atomicRepository

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
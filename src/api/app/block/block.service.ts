import { injectable, inject } from 'inversify'
import { IBlockService } from './block.interface'
import {
    AssociateOptions,
    UnAssociateOptions
} from './block.types'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'
import { Block } from './entities/block.entity'
import { Repository, Connection } from 'typeorm'

@injectable()
export class BlockService implements IBlockService {

    private blockRepository: Promise<Repository<Block>>

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmConnectionApp)
        connection: Promise<Connection>
    ) {
        this.blockRepository = connection
            .then(connection => {
                return connection.getRepository(Block)
            })
    }

    public async associate(options: AssociateOptions): Promise<void> {
        const blockRepository = await this.blockRepository

        await blockRepository.save({
            name: options.name,
            version: options.version,
            path: options.path
        })
    }

    public async unassociate(options: UnAssociateOptions): Promise<void> {
        const blockRepository = await this.blockRepository

        const block = await blockRepository.findOne({
            name: options.name,
            version: options.version
        })

        if (!block) {
            return
        }

        await blockRepository.remove(block)
    }

}
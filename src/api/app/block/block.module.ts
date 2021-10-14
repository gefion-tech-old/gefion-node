import { AsyncContainerModule, interfaces } from 'inversify'
import { IBlockService } from './block.interface'
import { BlockService } from './block.service'
import { BLOCK_SYMBOL } from './block.types'
import { Block } from './entities/block.entity'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'
import { EntitySchema } from 'typeorm'

export const BlockModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<IBlockService>(BLOCK_SYMBOL.BlockService)
        .to(BlockService)
    
    // Сущности
    bind<EntitySchema<Block>>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(Block)
        .whenTargetNamed(BLOCK_SYMBOL.BlockEntity)
})
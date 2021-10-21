import { AsyncContainerModule, interfaces } from 'inversify'
import { IVersionService } from './version/version.interface'
import { VersionService } from './version/version.service'
import { BLOCK_SYMBOL } from './block.types'
import { BlockVersion } from './entities/block-version.entity'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'
import { EntitySchema } from 'typeorm'
import { BlockInstance } from './entities/block-instance.entity'
import { IInstanceService } from './instance/instance.interface'
import { InstanceService } from './instance/instance.service'
import { 
    RPC_SYMBOL,
    IRPCMethod
} from '../../../core/rpc/rpc.types'
import { StartInstanceRPCMethod } from './instance/rpc/start-instance.rpc'
import { RestartInstanceRPCMethod } from './instance/rpc/restart-instance.rpc'
import { RemoveInstanceRPCMethod } from './instance/rpc/remove-instance.rpc'
import { InstanceRepair } from './instance/instance.repair'
import {
    RepairJob,
    REPAIR_TYPES
} from '../../../core/repair/repair.types'

export const BlockModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    /**
     * Version
     */
    bind<IVersionService>(BLOCK_SYMBOL.BlockVersionService)
        .to(VersionService)

    bind<EntitySchema<BlockVersion>>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(BlockVersion)
        .whenTargetNamed(BLOCK_SYMBOL.BlockVersionEntity)
    
    /**
     * Instance
     */
    bind<IInstanceService>(BLOCK_SYMBOL.BlockInstanceService)
        .to(InstanceService)
        .inSingletonScope()
    
    bind<EntitySchema<BlockInstance>>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(BlockInstance)
        .whenTargetNamed(BLOCK_SYMBOL.BlockInstanceEntity)

    bind<IRPCMethod>(RPC_SYMBOL.RPCMethod)
        .to(StartInstanceRPCMethod)
        .whenTargetNamed(BLOCK_SYMBOL.BlockInstanceStartRPC)

    bind<IRPCMethod>(RPC_SYMBOL.RPCMethod)
        .to(RestartInstanceRPCMethod)
        .whenTargetNamed(BLOCK_SYMBOL.BlockInstanceRestartRPC)

    bind<IRPCMethod>(RPC_SYMBOL.RPCMethod)
        .to(RemoveInstanceRPCMethod)
        .whenTargetNamed(BLOCK_SYMBOL.BlockInstanceRemoveRPC)

    bind<RepairJob>(REPAIR_TYPES.RepairJob)
        .to(InstanceRepair)
        .whenTargetNamed(BLOCK_SYMBOL.BlockInstanceRepair)
})
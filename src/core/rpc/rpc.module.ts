import { AsyncContainerModule, interfaces } from 'inversify'
import { RPC_SYMBOL } from './rpc.types'
import { TYPEORM_SYMBOL } from '../typeorm/typeorm.types'
import { EntitySchema } from 'typeorm'
import { RPCInfo } from './entities/rpc-info.entity'
import { IStoreService } from './store/store.interface'
import { StoreService } from './store/store.service'
import { getRpcHttpPlugin } from './rpc.http'
import { FASTIFY_SYMBOL } from '../fastify/fastify.types'
import { FastifyPluginAsync } from 'fastify'
import { IRPCService } from './rpc.interface'
import { RPCService } from './rpc.service'
import { INIT_SYMBOL, InitRunner } from '../init/init.types'
import { RPCInit } from './rpc.init'
import { IRequestService } from './request/request.interface'
import { RequestService } from './request/request.service'
import { REPAIR_TYPES, RepairJob } from '../repair/repair.types'
import { StoreRepair } from './store/store.repair'

export const RPCModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<IStoreService>(RPC_SYMBOL.RPCStoreService)
        .to(StoreService)
        .inSingletonScope()

    bind<Promise<FastifyPluginAsync>>(FASTIFY_SYMBOL.FastifyPlugin)
        .toDynamicValue(getRpcHttpPlugin)

    bind<IRPCService>(RPC_SYMBOL.RPCService)
        .to(RPCService)
        .inSingletonScope()

    bind<IRequestService>(RPC_SYMBOL.RPCRequestService)
        .to(RequestService)

    bind<InitRunner>(INIT_SYMBOL.InitRunner)
        .to(RPCInit)
        .whenTargetNamed(RPC_SYMBOL.RPCInit)

    bind<RepairJob>(REPAIR_TYPES.RepairJob)
        .to(StoreRepair)
        .whenTargetNamed(RPC_SYMBOL.RPCStoreRepair)

    // Сущности
    bind<EntitySchema<RPCInfo>>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(RPCInfo)
        .whenTargetNamed(RPC_SYMBOL.RPCInfoEntity)
})
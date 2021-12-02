import { AsyncContainerModule, interfaces } from 'inversify'
import { ISignalService } from './signal.interface'
import { SignalService } from './signal.service'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'
import { SIGNAL_SYMBOL } from './signal.type'
import { 
    Signal,
    SignalValidatorMethod,
    SignalGuardMethod,
    SignalFilterMethod,
    SignalGraph
} from '../entities/signal.entity'
import { IGraphCacheService } from './graph-cache/graph-cache.interface'
import { GraphCacheService } from './graph-cache/graph-cache.service'
import { IRPCMethod, RPC_SYMBOL } from '../../../core/rpc/rpc.types'
import { UpdateSignalRPCMethod } from './graph-cache/rpc/update-signal.rpc'
import { UpdateSignalsRPCMethod } from './graph-cache/rpc/update-signals.rpc'
import { InitRunner, INIT_SYMBOL } from '../../../core/init/init.types'
import { InitGraphCache } from './graph-cache/graph-cache.init'

export const SignalModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<Function>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(Signal)
        .whenTargetNamed(SIGNAL_SYMBOL.SignalEntity)

    bind<Function>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(SignalValidatorMethod)
        .whenTargetNamed(SIGNAL_SYMBOL.SignalValidatorMethodEntity)

    bind<Function>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(SignalGuardMethod)
        .whenTargetNamed(SIGNAL_SYMBOL.SignalGuardMethodEntity)

    bind<Function>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(SignalFilterMethod)
        .whenTargetNamed(SIGNAL_SYMBOL.SignalFilterMethodEntity)

    bind<Function>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(SignalGraph)
        .whenTargetNamed(SIGNAL_SYMBOL.SignalGraphEntity)

    bind<ISignalService>(SIGNAL_SYMBOL.SignalService)
        .to(SignalService)
        .inSingletonScope()

    bind<IGraphCacheService>(SIGNAL_SYMBOL.GraphCacheService)
        .to(GraphCacheService)
        .inSingletonScope()

    bind<IRPCMethod>(RPC_SYMBOL.RPCMethod)
        .to(UpdateSignalRPCMethod)
        .whenTargetNamed(SIGNAL_SYMBOL.GraphCacheUpdateSignalRPC)

    bind<IRPCMethod>(RPC_SYMBOL.RPCMethod)
        .to(UpdateSignalsRPCMethod)
        .whenTargetNamed(SIGNAL_SYMBOL.GraphCacheUpdateSignalsRPC)

    bind<InitRunner>(INIT_SYMBOL.InitRunner)
        .to(InitGraphCache)
        .whenTargetNamed(SIGNAL_SYMBOL.GraphCacheInit)
})
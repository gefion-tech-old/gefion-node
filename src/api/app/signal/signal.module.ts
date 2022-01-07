import { AsyncContainerModule, interfaces } from 'inversify'
import { ISignalService } from './signal.interface'
import { SignalService } from './signal.service'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'
import { SIGNAL_SYMBOL } from './signal.types'
import { 
    Signal,
    SignalValidator,
    SignalGuard,
    SignalFilter,
    SignalGraph,
    Guard,
    Filter,
    Validator
} from '../entities/signal.entity'
import { IGraphCacheService } from './graph-cache/graph-cache.interface'
import { GraphCacheService } from './graph-cache/graph-cache.service'
import { IRPCMethod, RPC_SYMBOL } from '../../../core/rpc/rpc.types'
import { UpdateSignalRPCMethod } from './graph-cache/rpc/update-signal.rpc'
import { UpdateSignalsRPCMethod } from './graph-cache/rpc/update-signals.rpc'
import { InitRunner, INIT_SYMBOL } from '../../../core/init/init.types'
import { InitGraphCache } from './graph-cache/graph-cache.init'
import { IGuardService } from './guard/guard.interface'
import { GuardService } from './guard/guard.service'
import { IFilterService } from './filter/filter.interface'
import { FilterService } from './filter/filter.service'
import { IValidatorService } from './validator/validator.interface'
import { ValidatorService } from './validator/validator.service'

export const SignalModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<Function>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(Signal)
        .whenTargetNamed(SIGNAL_SYMBOL.SignalEntity)

    bind<Function>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(SignalValidator)
        .whenTargetNamed(SIGNAL_SYMBOL.SignalValidatorEntity)

    bind<Function>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(SignalGuard)
        .whenTargetNamed(SIGNAL_SYMBOL.SignalGuardEntity)

    bind<Function>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(SignalFilter)
        .whenTargetNamed(SIGNAL_SYMBOL.SignalFilterEntity)

    bind<Function>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(SignalGraph)
        .whenTargetNamed(SIGNAL_SYMBOL.SignalGraphEntity)

    bind<Function>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(Guard)
        .whenTargetNamed(SIGNAL_SYMBOL.GuardEntity)

    bind<Function>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(Filter)
        .whenTargetNamed(SIGNAL_SYMBOL.FilterEntity)

    bind<Function>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(Validator)
        .whenTargetNamed(SIGNAL_SYMBOL.ValidatorEntity)

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

    bind<IGuardService>(SIGNAL_SYMBOL.GuardService)
        .to(GuardService)
        .inSingletonScope()

    bind<IFilterService>(SIGNAL_SYMBOL.FilterService)
        .to(FilterService)
        .inSingletonScope()

    bind<IValidatorService>(SIGNAL_SYMBOL.ValidatorService)
        .to(ValidatorService)
        .inSingletonScope()
})
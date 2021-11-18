import { AsyncContainerModule, interfaces } from 'inversify'
import { METHOD_SYMBOL } from './method.types'
import { TYPEORM_SYMBOL } from '../../../core/typeorm/typeorm.types'
import { Method } from '../entities/method.entity'
import { IMethodService } from './method.interface'
import { MethodService } from './method.service'
import { IRPCMethod, RPC_SYMBOL } from '../../../core/rpc/rpc.types'
import { IsAvailableRPCMethod } from './rpc/is-available.rpc'
import { IIssueService } from './issue/issue.interface'
import { IssueService } from './issue/issue.service'

export const MethodModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<Function>(TYPEORM_SYMBOL.TypeOrmAppEntity)
        .toConstructor(Method)
        .whenTargetNamed(METHOD_SYMBOL.MethodEntity)

    bind<IMethodService>(METHOD_SYMBOL.MethodService)
        .to(MethodService)
        .inSingletonScope()

    bind<IIssueService>(METHOD_SYMBOL.IssueService)
        .to(IssueService)

    bind<IRPCMethod>(RPC_SYMBOL.RPCMethod)
        .to(IsAvailableRPCMethod)
        .whenTargetNamed(METHOD_SYMBOL.MethodIsAvailableRPC)
})
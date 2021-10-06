import { AsyncContainerModule, interfaces } from 'inversify'
import {
    VM_SYMBOL
} from '../../../../../core/vm/vm.types'
import {
    IAPIPropertyFactory
} from '../../../../../core/vm/api-property/api-property.interface'
import { SetTimeoutFactory } from './setTimeout.factory'

export const SetTimeoutModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<IAPIPropertyFactory>(VM_SYMBOL.APIPropertyFactorySystemV1)
        .to(SetTimeoutFactory)
})
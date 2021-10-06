import { AsyncContainerModule, interfaces } from 'inversify'
import { VM_SYMBOL } from '../../../../../core/vm/vm.types'
import { 
    IAPIPropertyFactory 
} from '../../../../../core/vm/api-property/api-property.interface'
import { ClearIntervalFactory } from './clearInterval.factory'

export const ClearIntervalModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<IAPIPropertyFactory>(VM_SYMBOL.APIPropertyFactorySystemV1)
        .to(ClearIntervalFactory)
})
import { AsyncContainerModule, interfaces } from 'inversify'
import { VM_SYMBOL } from '../../../core/vm/vm.types'
import { PromiseFactory } from './promise.factory'
import { IAPIPropertyFactory } from '../../../core/vm/api-property/api-property.interface'

export const PromiseModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<IAPIPropertyFactory>(VM_SYMBOL.APIPropertyFactorySystemV1)
        .to(PromiseFactory)
})
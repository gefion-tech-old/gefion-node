import { AsyncContainerModule, interfaces } from 'inversify'
import { VM2_SYMBOL } from './vm2.types'
import vm2 from 'vm2'

export const VM2Module = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<typeof vm2>(VM2_SYMBOL.VM2)
        .toConstantValue(vm2)
})
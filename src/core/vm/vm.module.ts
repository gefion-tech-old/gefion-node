import { AsyncContainerModule, interfaces } from 'inversify'
import { VM_SYMBOL, VMConfig } from './vm.types'
import { IVMService } from './vm.interface'
import { VMService } from './vm.service'
import { getVMConfig } from './vm.config'


export const VMModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<Promise<VMConfig>>(VM_SYMBOL.VMConfig)
        .toDynamicValue(getVMConfig)
        .inSingletonScope()

    bind<IVMService>(VM_SYMBOL.VMService)
        .to(VMService)
        .inSingletonScope()
})
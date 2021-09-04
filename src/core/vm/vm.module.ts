import { AsyncContainerModule, interfaces } from 'inversify'
import { VM_SYMBOL, VMConfig } from './vm.types'
import { IVMService } from './vm.interface'
import { VMService } from './vm.service'
import { getVMConfig } from './vm.config'
import { IScriptStarterService } from './script-starter/script-starter.interface'
import { ScriptStarterService } from './script-starter/script-starter.service'


export const VMModule = new AsyncContainerModule(async (bind: interfaces.Bind) => {
    bind<Promise<VMConfig>>(VM_SYMBOL.VMConfig)
        .toDynamicValue(getVMConfig)
        .inSingletonScope()

    bind<IVMService>(VM_SYMBOL.VMService)
        .to(VMService)
        .inSingletonScope()

    bind<IScriptStarterService>(VM_SYMBOL.ScriptStarterService)
        .to(ScriptStarterService)
})
import { VMModules } from './vm/vm.modules'
import { APPModules } from './app/app.modules'

export const APIModules = [
    ...VMModules,
    ...APPModules
]
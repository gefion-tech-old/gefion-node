import { PromiseModule } from './promise/promise.module'
import { TimeoutModules } from './timeout/timeout.modules'

export const SystemV1Name = 'systemV1'

export const SystemV1Modules = [
    PromiseModule,
    ...TimeoutModules
]
